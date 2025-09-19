import UIKit
import UniformTypeIdentifiers
import ImageIO

class ShareViewController: UIViewController {
  let isProdBundle = !Bundle.main.bundleIdentifier!.hasSuffix(".dev.share")
  let appScheme = !Bundle.main.bundleIdentifier!.hasSuffix(".dev.share")
    ? "soonlist"
    : "soonlist.dev"
  let appGroup = !Bundle.main.bundleIdentifier!.hasSuffix(".dev.share")
    ? "group.com.soonlist"
    : "group.com.soonlist.dev"

  private let statusLabel: UILabel = {
    let label = UILabel()
    label.textAlignment = .center
    label.font = UIFont.systemFont(ofSize: 16, weight: .medium)
    label.textColor = .label
    label.numberOfLines = 2
    label.text = "Capturing…"
    return label
  }()

  private let spinner: UIActivityIndicatorView = {
    let indicator = UIActivityIndicatorView(style: .large)
    indicator.hidesWhenStopped = true
    return indicator
  }()

  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = .systemBackground

    spinner.translatesAutoresizingMaskIntoConstraints = false
    statusLabel.translatesAutoresizingMaskIntoConstraints = false
    view.addSubview(spinner)
    view.addSubview(statusLabel)

    NSLayoutConstraint.activate([
      spinner.centerXAnchor.constraint(equalTo: view.centerXAnchor),
      spinner.centerYAnchor.constraint(equalTo: view.centerYAnchor, constant: -12),
      statusLabel.topAnchor.constraint(equalTo: spinner.bottomAnchor, constant: 12),
      statusLabel.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 24),
      statusLabel.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -24),
    ])

    spinner.startAnimating()
  }

  override func viewDidAppear(_ animated: Bool) {
    super.viewDidAppear(animated)
    NSLog("ShareViewController did appear — bundleID: \(Bundle.main.bundleIdentifier ?? "nil")")
    NSLog("Using scheme: \(appScheme), group: \(appGroup)")

    guard let extensionItem = extensionContext?.inputItems.first as? NSExtensionItem,
          let firstAttachment = extensionItem.attachments?.first
    else {
      NSLog("No items/attachments to share. Completing.")
      self.completeRequest()
      return
    }

    Task { await self.captureAndSend(firstAttachment) }
  }

  private func captureAndSend(_ item: NSItemProvider) async {
    do {
      guard item.hasItemConformingToTypeIdentifier("public.image") else {
        NSLog("Not an image; finishing.")
        self.showAndDismiss(text: "Nothing to share", success: false)
        return
      }

      // Load first image
      let image: UIImage? = try await loadImage(from: item)
      guard let inputImage = image else {
        self.showAndDismiss(text: "Failed to load image", success: false)
        return
      }

      // Resize to width 640
      guard let resized = resizeImage(inputImage, targetWidth: 640) else {
        self.showAndDismiss(text: "Resize failed", success: false)
        return
      }

      // Encode to WebP @ q=0.5; fallback to JPEG
      guard let (encodedData, formatStr) = encodeImage(resized) else {
        self.showAndDismiss(text: "Encode failed", success: false)
        return
      }

      // Read token from app group
      guard let token = UserDefaults(suiteName: appGroup)?.string(forKey: "shareToken"), !token.isEmpty else {
        NSLog("Missing share token in app group")
        self.showAndDismiss(text: "Missing share token", success: false)
        return
      }

      // Resolve Convex base URL
      guard let baseUrl = resolveConvexBaseUrl() else {
        NSLog("Missing Convex base URL")
        self.showAndDismiss(text: "Config error", success: false)
        return
      }

      let endpoint = baseUrl.appendingPathComponent("share/v1/capture")
      let timezone = UserDefaults(suiteName: appGroup)?.string(forKey: "timezone") ?? TimeZone.current.identifier

      let payload: [String: Any] = [
        "kind": "image",
        "base64Image": encodedData.base64EncodedString(),
        "format": formatStr,
        "timezone": timezone,
        "comment": NSNull(),
        "lists": [],
        "visibility": "private",
      ]

      var request = URLRequest(url: endpoint)
      request.httpMethod = "POST"
      request.setValue("application/json", forHTTPHeaderField: "Content-Type")
      request.setValue(token, forHTTPHeaderField: "X-Share-Token")
      request.timeoutInterval = 20
      request.httpBody = try JSONSerialization.data(withJSONObject: payload, options: [])

      let (responseData, response) = try await URLSession.shared.data(for: request)
      if let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) {
        NSLog("Share sent successfully: status=\(http.statusCode)")
        NSLog("Response: \(String(data: responseData, encoding: .utf8) ?? "<none>")")
        self.showAndDismiss(text: "Sent!", success: true)
      } else {
        let http = response as? HTTPURLResponse
        NSLog("Share failed: status=\(http?.statusCode ?? -1)")
        self.showAndDismiss(text: "Failed to send", success: false)
      }
    } catch {
      if let urlError = error as? URLError, urlError.code == .timedOut {
        NSLog("captureAndSend timed out: \(error)")
        self.showAndDismiss(text: "Timed out — check connection", success: false)
      } else {
        NSLog("captureAndSend error: \(error)")
        self.showAndDismiss(text: "Failed to send", success: false)
      }
    }
  }

  private func loadImage(from item: NSItemProvider) async throws -> UIImage? {
    if let dataUrl = try await item.loadItem(forTypeIdentifier: "public.image") as? URL {
      let data = try Data(contentsOf: dataUrl)
      return UIImage(data: data)
    }
    if let uiImage = try await item.loadItem(forTypeIdentifier: "public.image") as? UIImage {
      return uiImage
    }
    return nil
  }

  private func resizeImage(_ image: UIImage, targetWidth: CGFloat) -> UIImage? {
    let size = image.size
    if size.width <= targetWidth { return image }
    let scale = targetWidth / size.width
    let newSize = CGSize(width: targetWidth, height: floor(size.height * scale))

    let format = UIGraphicsImageRendererFormat()
    format.scale = 1.0
    format.opaque = false
    let renderer = UIGraphicsImageRenderer(size: newSize, format: format)
    let result = renderer.image { _ in
      image.draw(in: CGRect(origin: .zero, size: newSize))
    }
    return result
  }

  private func encodeImage(_ image: UIImage) -> (Data, String)? {
    guard let cgImage = image.cgImage else { return nil }

    // Try WebP first
    if let webpData = encodeWithImageIO(cgImage: cgImage, uti: webPIdentifier(), quality: 0.5) {
      return (webpData, "image/webp")
    }

    // Fallback to JPEG
    if #available(iOS 14.0, *) {
      let jpegUti = (UTType.jpeg.identifier as NSString) as CFString
      if let jpegData = encodeWithImageIO(cgImage: cgImage, uti: jpegUti, quality: 0.5) {
        return (jpegData as Data, "image/jpeg")
      }
    }

    // Ultimate fallback using UIImage API
    if let jpegData2 = image.jpegData(compressionQuality: 0.5) {
      return (jpegData2, "image/jpeg")
    }
    return nil
  }

  private func webPIdentifier() -> CFString {
    if #available(iOS 14.0, *) {
      return UTType.webP.identifier as CFString
    }
    // Known identifier for WebP on iOS
    return "org.webmproject.webp" as CFString
  }

  private func encodeWithImageIO(cgImage: CGImage, uti: CFString, quality: Double) -> Data? {
    let data = NSMutableData()
    guard let dest = CGImageDestinationCreateWithData(data as CFMutableData, uti, 1, nil) else {
      return nil
    }
    let properties = [kCGImageDestinationLossyCompressionQuality: quality] as CFDictionary
    CGImageDestinationAddImage(dest, cgImage, properties)
    guard CGImageDestinationFinalize(dest) else { return nil }
    return data as Data
  }

  private func resolveConvexBaseUrl() -> URL? {
    let defaults = UserDefaults(suiteName: appGroup)
    if let urlStr = defaults?.string(forKey: "convexHttpBaseURL"), let url = URL(string: urlStr) {
      return url
    }
    // Fallback to Info.plist
    let key = isProdBundle ? "ConvexHttpBaseURL" : "ConvexHttpBaseURLDev"
    if let value = Bundle.main.object(forInfoDictionaryKey: key) as? String, let url = URL(string: value) {
      return url
    }
    return nil
  }

  private func showAndDismiss(text: String, success: Bool) {
    DispatchQueue.main.async {
      self.spinner.stopAnimating()
      self.statusLabel.text = text
      self.statusLabel.textColor = success ? .systemGreen : .systemRed
      let delay: TimeInterval = success ? 0.6 : 1.2
      DispatchQueue.main.asyncAfter(deadline: .now() + delay) {
        self.completeRequest()
      }
    }
  }

  private func completeRequest() {
    NSLog("completeRequest called. Dismissing share extension.")
    self.extensionContext?.completeRequest(returningItems: nil)
  }

  @objc func openURL(_ url: URL) -> Bool {
    var responder: UIResponder? = self
    while responder != nil {
      if let application = responder as? UIApplication {
        application.open(url)
        return true
      }
      responder = responder?.next
    }
    return false
  }
}