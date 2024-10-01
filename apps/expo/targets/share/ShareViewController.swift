import UIKit
import UniformTypeIdentifiers
import ImageIO
import MobileCoreServices

class ShareViewController: UIViewController {
  let isProdBundle = !Bundle.main.bundleIdentifier!.hasSuffix(".dev.share")
  let appScheme = !Bundle.main.bundleIdentifier!.hasSuffix(".dev.share") ? "soonlist" : "soonlist.dev"
  let appGroup = !Bundle.main.bundleIdentifier!.hasSuffix(".dev.share") ? "group.com.soonlist" : "group.com.soonlist.dev"

  //
  override func viewDidAppear(_ animated: Bool) {
    super.viewDidAppear(animated)

    guard let extensionItem = extensionContext?.inputItems.first as? NSExtensionItem,
          let firstAttachment = extensionItem.attachments?.first
    else {
      self.completeRequest()
      return
    }

    Task {
      if firstAttachment.hasItemConformingToTypeIdentifier("public.text") {
        await self.handleText(item: firstAttachment)
      } else if firstAttachment.hasItemConformingToTypeIdentifier("public.image") {
        await self.handleImage(item: firstAttachment)
      } else if firstAttachment.hasItemConformingToTypeIdentifier("public.url") {
        await self.handleUrl(item: firstAttachment)
      } else {
        self.completeRequest()
      }
    }
  }

  private func handleText(item: NSItemProvider) async {
    do {
      if let data = try await item.loadItem(forTypeIdentifier: "public.text") as? String {
        if let encoded = data.addingPercentEncoding(withAllowedCharacters: .urlHostAllowed),
           let url = URL(string: "\(self.appScheme)://feed?intent=new&text=\(encoded)") {
          _ = self.openURL(url)
        }
      }
      self.completeRequest()
    } catch {
      self.completeRequest()
    }
  }

  private func handleUrl(item: NSItemProvider) async {
    do {
      if let data = try await item.loadItem(forTypeIdentifier: "public.url") as? URL {
        if let encoded = data.absoluteString.addingPercentEncoding(withAllowedCharacters: .urlHostAllowed),
           let url = URL(string: "\(self.appScheme)://feed?intent=new&text=\(encoded)") {
          _ = self.openURL(url)
        }
      }
      self.completeRequest()
    } catch {
      self.completeRequest()
    }
  }

  private func handleImage(item: NSItemProvider) async {
    var valid = true
    var imageUriInfo: String?

    do {
        if let dataUri = try await item.loadItem(forTypeIdentifier: "public.image") as? URL {
            let data = try Data(contentsOf: dataUri)
            if let image = UIImage(data: data) {
                imageUriInfo = self.compressAndSaveImage(image)
            }
        } else if let image = try await item.loadItem(forTypeIdentifier: "public.image") as? UIImage {
            imageUriInfo = self.compressAndSaveImage(image)
        }
    } catch {
        valid = false
    }

    if valid,
       let imageUriInfo = imageUriInfo,
       let encoded = imageUriInfo.addingPercentEncoding(withAllowedCharacters: .urlHostAllowed),
       let url = URL(string: "\(self.appScheme)://feed?intent=new&imageUri=\(encoded)") {
        _ = self.openURL(url)
    }

    self.completeRequest()
  }

  private func compressAndSaveImage(_ image: UIImage) -> String? {
    guard let dir = FileManager().containerURL(forSecurityApplicationGroupIdentifier: self.appGroup) else {
        return nil
    }

    let fileName = "\(ProcessInfo.processInfo.globallyUniqueString).jpeg"
    let fileURL = dir.appendingPathComponent(fileName)

    guard let destination = CGImageDestinationCreateWithURL(fileURL as CFURL, UTType.jpeg.identifier as CFString, 1, nil) else {
        return nil
    }

    let maxDimension: CGFloat = 1284
    let options: [CFString: Any] = [
        kCGImageSourceCreateThumbnailFromImageAlways: true,
        kCGImageSourceCreateThumbnailWithTransform: true,
        kCGImageSourceThumbnailMaxPixelSize: maxDimension,
        kCGImageDestinationLossyCompressionQuality: 0.7
    ]

    // Create a drawing context and draw the image with the correct orientation
    UIGraphicsBeginImageContextWithOptions(image.size, false, image.scale)
    defer { UIGraphicsEndImageContext() }
    
    image.draw(in: CGRect(origin: .zero, size: image.size))
    
    guard let normalizedImage = UIGraphicsGetImageFromCurrentImageContext(),
          let cgImage = normalizedImage.cgImage else {
        return nil
    }

    // Add the normalized image to the destination
    CGImageDestinationAddImage(destination, cgImage, options as CFDictionary)
    
    if CGImageDestinationFinalize(destination) {
        return "\(fileURL.absoluteString)|\(image.size.width)|\(image.size.height)"
    } else {
        return nil
    }
  }

  private func resizeImage(_ image: UIImage, targetSize: CGSize) -> UIImage {
    let size = image.size
    let widthRatio  = targetSize.width  / size.width
    let heightRatio = targetSize.height / size.height
    let newSize: CGSize
    
    if widthRatio > heightRatio {
        newSize = CGSize(width: size.width * heightRatio, height: size.height * heightRatio)
    } else {
        newSize = CGSize(width: size.width * widthRatio,  height: size.height * widthRatio)
    }
    
    let rect = CGRect(x: 0, y: 0, width: newSize.width, height: newSize.height)
    
    UIGraphicsBeginImageContextWithOptions(newSize, false, 1.0)
    image.draw(in: rect)
    let newImage = UIGraphicsGetImageFromCurrentImageContext()
    UIGraphicsEndImageContext()
    
    return newImage ?? image
  }

  private func saveImageWithInfo(_ image: UIImage?) -> String? {
    guard let image = image else {
      return nil
    }

    do {
      // Saving this file to the bundle group's directory lets us access it from
      // inside of the app. Otherwise, we wouldn't have access even though the
      // extension does.
      if let dir = FileManager()
        .containerURL(
          forSecurityApplicationGroupIdentifier: self.appGroup) {
        let filePath = "\(dir.absoluteString)\(ProcessInfo.processInfo.globallyUniqueString).jpeg"

        if let newUri = URL(string: filePath),
           let jpegData = image.jpegData(compressionQuality: 1) {
          try jpegData.write(to: newUri)
          return "\(newUri.absoluteString)|\(image.size.width)|\(image.size.height)"
        }
      }
      return nil
    } catch {
      return nil
    }
  }

  private func completeRequest() {
    self.extensionContext?.completeRequest(returningItems: nil)
  }

  @objc func openURL(_ url: URL) -> Bool {
    var responder: UIResponder? = self
    while responder != nil {
      if let application = responder as? UIApplication {
          return application.perform(#selector(openURL(_:)), with: url) != nil
      }
      responder = responder?.next
    }
    return false
  }
}
