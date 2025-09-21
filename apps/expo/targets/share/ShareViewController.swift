import UIKit
import UniformTypeIdentifiers
import ImageIO
import Security
import os.log

class ShareViewController: UIViewController {
  let isProdBundle = !Bundle.main.bundleIdentifier!.hasSuffix(".dev.share")
  let appScheme = !Bundle.main.bundleIdentifier!.hasSuffix(".dev.share")
    ? "soonlist"
    : "soonlist.dev"
  let appGroup = !Bundle.main.bundleIdentifier!.hasSuffix(".dev.share")
    ? "group.com.soonlist"
    : "group.com.soonlist.dev"

  // Shared Keychain configuration (match app access group; no custom service)
  var keychainAccessGroup: String { appGroup }

  private let log = OSLog(
    subsystem: Bundle.main.bundleIdentifier ?? "com.soonlist",
    category: "ShareViewController"
  )

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
    os_log("ShareViewController did appear — bundleID: %{public}@", log: log, type: .info, Bundle.main.bundleIdentifier ?? "nil")
    os_log("Using scheme: %{public}@, group: %{public}@", log: log, type: .info, appScheme, appGroup)

    guard let extensionItem = extensionContext?.inputItems.first as? NSExtensionItem,
          let firstAttachment = extensionItem.attachments?.first
    else {
      os_log("No items/attachments to share. Completing.", log: log, type: .info)
      self.completeRequest()
      return
    }

    Task { await self.captureAndSend(firstAttachment) }
  }

  private func captureAndSend(_ item: NSItemProvider) async {
    do {
      guard item.hasItemConformingToTypeIdentifier("public.image") else {
        os_log("Not an image; finishing.", log: log, type: .info)
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

      // Read token from Keychain
      guard let token = readKeychainString(account: "SL_SHARE_TOKEN"), !token.isEmpty else {
        os_log("Missing share token in Keychain", log: log, type: .error)
        self.showAndDismiss(text: "Missing share token", success: false)
        return
      }

      // Resolve Convex base URL
      guard let baseUrl = resolveConvexBaseUrl() else {
        os_log("Missing Convex base URL", log: log, type: .error)
        self.showAndDismiss(text: "Config error", success: false)
        return
      }

      let endpoint = baseUrl.appendingPathComponent("share/v1/capture")
      os_log("Using Convex endpoint: %{public}@", log: log, type: .debug, endpoint.absoluteString)
      let timezone = TimeZone.current.identifier
      os_log("Current timezone: %{public}@", log: log, type: .debug, timezone)

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
        os_log("Share sent successfully: status=%{public}@", log: log, type: .info, String(http.statusCode))
        os_log("Response: %{public}@", log: log, type: .debug, String(data: responseData, encoding: .utf8) ?? "<none>")
        self.showAndDismiss(text: "Sent!", success: true)
      } else {
        let http = response as? HTTPURLResponse
        os_log("Share failed: status=%{public}@", log: log, type: .error, String(http?.statusCode ?? -1))
        self.showAndDismiss(text: "Failed to send", success: false)
      }
    } catch {
      if let urlError = error as? URLError, urlError.code == .timedOut {
        os_log("captureAndSend timed out: %{public}@", log: log, type: .error, String(describing: error))
        self.showAndDismiss(text: "Timed out — check connection", success: false)
      } else {
        os_log("captureAndSend error: %{public}@", log: log, type: .error, String(describing: error))
        self.showAndDismiss(text: "Failed to send", success: false)
      }
    }
  }

  private func loadImage(from item: NSItemProvider) async throws -> UIImage? {
    os_log("loadImage: registered types = %{public}@", log: log, type: .debug, String(describing: item.registeredTypeIdentifiers))

    // 1) Try the most direct path — ask the provider for a UIImage it can produce
    if item.canLoadObject(ofClass: UIImage.self) {
      do {
        if let image = try await loadUIImageViaLoadObject(item) {
          os_log("loadImage: succeeded via loadObject(UIImage)", log: log, type: .debug)
          return image
        } else {
          os_log("loadImage: loadObject(UIImage) returned nil", log: log, type: .debug)
        }
      } catch {
        os_log("loadImage: loadObject(UIImage) error: %{public}@", log: log, type: .error, String(describing: error))
      }
    } else {
      os_log("loadImage: provider cannot load UIImage directly", log: log, type: .debug)
    }

    // 2) Try data/file representations for a set of likely identifiers
    let candidates: [String] = {
      var list: [String] = []
      if #available(iOS 14.0, *) {
        list.append(contentsOf: [
          UTType.png.identifier,
          UTType.jpeg.identifier,
          UTType.heic.identifier,
          UTType.tiff.identifier,
          UTType.image.identifier
        ])
      } else {
        list.append(contentsOf: [
          "public.png",
          "public.jpeg",
          "public.heic",
          "public.tiff",
          "public.image"
        ])
      }
      // Common private identifier used by some apps
      list.append("com.apple.uikit.image")
      // Also try any advertised identifiers from the provider, first
      let advertised = item.registeredTypeIdentifiers
      return advertised + list
    }()

    for typeId in candidates {
      guard item.hasItemConformingToTypeIdentifier(typeId) else { continue }

      // 2a) Try data representation
      if let data = try? await loadDataRepresentation(item: item, typeIdentifier: typeId) {
        if let img = UIImage(data: data) {
          os_log("loadImage: succeeded via dataRepresentation type=%{public}@ bytes=%{public}@", log: log, type: .debug, typeId, String(data.count))
          return img
        } else {
          os_log("loadImage: dataRepresentation produced non-decodable data type=%{public}@ bytes=%{public}@", log: log, type: .debug, typeId, String(data.count))
        }
      } else {
        os_log("loadImage: no dataRepresentation for type=%{public}@", log: log, type: .debug, typeId)
      }

      // 2b) Try file representation (copy to our tmp before use)
      if let url = try? await loadFileRepresentationCopy(item: item, typeIdentifier: typeId) {
        do {
          let data = try Data(contentsOf: url)
          if let img = UIImage(data: data) {
            os_log("loadImage: succeeded via fileRepresentation type=%{public}@ path=%{public}@", log: log, type: .debug, typeId, url.path)
            return img
          } else {
            os_log("loadImage: fileRepresentation data not decodable type=%{public}@ path=%{public}@", log: log, type: .debug, typeId, url.path)
          }
        } catch {
          os_log("loadImage: failed to read fileRepresentation url=%{public}@ error=%{public}@", log: log, type: .error, String(describing: url), String(describing: error))
        }
      } else {
        os_log("loadImage: no fileRepresentation for type=%{public}@", log: log, type: .debug, typeId)
      }

      // 2c) Fallback to legacy loadItem for this specific type
      do {
        let obj = try await item.loadItem(forTypeIdentifier: typeId)
        if let url = obj as? URL {
            do {
              let data = try Data(contentsOf: url)
              if let img = UIImage(data: data) {
                os_log("loadImage: succeeded via loadItem URL type=%{public}@", log: log, type: .debug, typeId)
                return img
              } else {
                os_log("loadImage: loadItem URL data not decodable type=%{public}@", log: log, type: .debug, typeId)
              }
            } catch {
              os_log("loadImage: loadItem URL->Data error type=%{public}@ error=%{public}@", log: log, type: .error, typeId, String(describing: error))
            }
        } else if let data = obj as? Data, let img = UIImage(data: data) {
            os_log("loadImage: succeeded via loadItem Data type=%{public}@ bytes=%{public}@", log: log, type: .debug, typeId, String(data.count))
            return img
        } else if let img = obj as? UIImage {
            os_log("loadImage: succeeded via loadItem UIImage type=%{public}@", log: log, type: .debug, typeId)
            return img
        } else {
            os_log("loadImage: loadItem returned unexpected object type=%{public}@ for typeId=%{public}@", log: log, type: .debug, String(describing: type(of: obj)), typeId)
        }
      } catch {
        os_log("loadImage: loadItem error for type=%{public}@ error=%{public}@", log: log, type: .error, typeId, String(describing: error))
      }
    }

    os_log("loadImage: exhausted candidates; returning nil", log: log, type: .debug)
    return nil
  }

  private func loadUIImageViaLoadObject(_ item: NSItemProvider) async throws -> UIImage? {
    try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<UIImage?, Error>) in
      _ = item.loadObject(ofClass: UIImage.self) { object, error in
        if let error = error {
          continuation.resume(throwing: error)
          return
        }
        let image = object as? UIImage
        continuation.resume(returning: image)
      }
    }
  }

  private func loadDataRepresentation(item: NSItemProvider, typeIdentifier: String) async throws -> Data? {
    try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Data?, Error>) in
      _ = item.loadDataRepresentation(forTypeIdentifier: typeIdentifier) { data, error in
        if let error = error {
          continuation.resume(throwing: error)
          return
        }
        continuation.resume(returning: data)
      }
    }
  }

  private func loadFileRepresentationCopy(item: NSItemProvider, typeIdentifier: String) async throws -> URL? {
    try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<URL?, Error>) in
      _ = item.loadFileRepresentation(forTypeIdentifier: typeIdentifier) { url, error in
        if let error = error {
          continuation.resume(throwing: error)
          return
        }
        guard let sourceURL = url else {
          continuation.resume(returning: nil)
          return
        }
        // Copy to our own tmp file to ensure lifetime beyond the callback
        let ext = sourceURL.pathExtension
        let tmpDir = URL(fileURLWithPath: NSTemporaryDirectory(), isDirectory: true)
        let destURL = tmpDir.appendingPathComponent(UUID().uuidString).appendingPathExtension(ext)
        do {
          if FileManager.default.fileExists(atPath: destURL.path) {
            try FileManager.default.removeItem(at: destURL)
          }
          try FileManager.default.copyItem(at: sourceURL, to: destURL)
          continuation.resume(returning: destURL)
        } catch {
          continuation.resume(throwing: error)
        }
      }
    }
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
    // Try SecureStore-written key first (same key as env sync)
    if let urlStr = readKeychainString(account: "EXPO_PUBLIC_CONVEX_URL"), let url = URL(string: urlStr) {
      return url
    }
    // Fallback to Info.plist
    let key = isProdBundle ? "ConvexHttpBaseURL" : "ConvexHttpBaseURLDev"
    if let value = Bundle.main.object(forInfoDictionaryKey: key) as? String, let url = URL(string: value) {
      return url
    }
    return nil
  }

  private func readKeychainString(account: String) -> String? {
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrAccount as String: account,
      kSecAttrAccessGroup as String: keychainAccessGroup,
      kSecReturnData as String: true,
      kSecMatchLimit as String: kSecMatchLimitOne
    ]

    var item: CFTypeRef?
    let status = SecItemCopyMatching(query as CFDictionary, &item)
    guard status == errSecSuccess, let data = item as? Data else {
      return nil
    }
    return String(data: data, encoding: .utf8)
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
    os_log("completeRequest called. Dismissing share extension.", log: log, type: .info)
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
