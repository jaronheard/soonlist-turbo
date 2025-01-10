import UIKit

class ShareViewController: UIViewController {
  let isProdBundle = !Bundle.main.bundleIdentifier!.hasSuffix(".dev.share")
  let appScheme = !Bundle.main.bundleIdentifier!.hasSuffix(".dev.share") ? "soonlist" : "soonlist.dev"
  let appGroup = !Bundle.main.bundleIdentifier!.hasSuffix(".dev.share") ? "group.com.soonlist" : "group.com.soonlist.dev"

  override func viewDidAppear(_ animated: Bool) {
    super.viewDidAppear(animated)

    guard let extensionItem = extensionContext?.inputItems.first as? NSExtensionItem,
          let firstAttachment = extensionItem.attachments?.first
    else {
      // Nothing to share; bail out
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
        // If no recognized type, bail out
        self.completeRequest()
      }
    }
  }

  private func handleText(item: NSItemProvider) async {
    do {
      // Try to load text from the attachment
      if let data = try await item.loadItem(forTypeIdentifier: "public.text") as? String,
         let encoded = data.addingPercentEncoding(withAllowedCharacters: .urlHostAllowed),
         let url = URL(string: "\(appScheme)://new?text=\(encoded)") {
        // We successfully got a URL; open it and don't call completeRequest() here.
        openInContainerApp(url)
      } else {
        // If text load or URL creation failed, just complete
        completeRequest()
      }
    } catch {
      // If any error, complete
      completeRequest()
    }
  }

  private func handleUrl(item: NSItemProvider) async {
    do {
      if let data = try await item.loadItem(forTypeIdentifier: "public.url") as? URL,
         let encoded = data.absoluteString.addingPercentEncoding(withAllowedCharacters: .urlHostAllowed),
         let url = URL(string: "\(appScheme)://new?text=\(encoded)") {
        openInContainerApp(url)
      } else {
        completeRequest()
      }
    } catch {
      completeRequest()
    }
  }

  private func handleImage(item: NSItemProvider) async {
    var valid = true
    var imageUriInfo: String?

    do {
      // Attempt to load the image
      if let dataUri = try await item.loadItem(forTypeIdentifier: "public.image") as? URL {
        let data = try Data(contentsOf: dataUri)
        let image = UIImage(data: data)
        imageUriInfo = saveImageWithInfo(image)
      } else if let image = try await item.loadItem(forTypeIdentifier: "public.image") as? UIImage {
        imageUriInfo = saveImageWithInfo(image)
      }
    } catch {
      valid = false
    }

    if valid,
       let imageUriInfo = imageUriInfo,
       let encoded = imageUriInfo.addingPercentEncoding(withAllowedCharacters: .urlHostAllowed),
       let url = URL(string: "\(appScheme)://new?imageUri=\(encoded)") {
      openInContainerApp(url)
    } else {
      completeRequest()
    }
  }

  private func saveImageWithInfo(_ image: UIImage?) -> String? {
    guard let image = image else { return nil }

    do {
      // Write the JPEG to the shared container
      if let dir = FileManager().containerURL(forSecurityApplicationGroupIdentifier: appGroup) {
        let filePath = "\(dir.absoluteString)\(ProcessInfo.processInfo.globallyUniqueString).jpeg"
        if let newUri = URL(string: filePath),
           let jpegData = image.jpegData(compressionQuality: 1) {
          try jpegData.write(to: newUri)
          // Return something like "file:///...|width|height"
          return "\(newUri.absoluteString)|\(image.size.width)|\(image.size.height)"
        }
      }
      return nil
    } catch {
      return nil
    }
  }

  private func completeRequest() {
    extensionContext?.completeRequest(returningItems: nil)
  }

  private func openInContainerApp(_ url: URL) {
    extensionContext?.open(url) { success in
      NSLog("Opened container app. Success? \(success)")
      // Now that we've attempted to open, we can complete the request
      self.completeRequest()
    }
  }
}
