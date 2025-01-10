import UIKit

class ShareViewController: UIViewController {
  let isProdBundle = !Bundle.main.bundleIdentifier!.hasSuffix(".dev.share")
  let appScheme = !Bundle.main.bundleIdentifier!.hasSuffix(".dev.share")
    ? "soonlist"
    : "soonlist.dev"
  let appGroup = !Bundle.main.bundleIdentifier!.hasSuffix(".dev.share")
    ? "group.com.soonlist"
    : "group.com.soonlist.dev"

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

    Task {
      if firstAttachment.hasItemConformingToTypeIdentifier("public.text") {
        NSLog("Attachment is public.text; handling text.")
        await self.handleText(item: firstAttachment)
      } else if firstAttachment.hasItemConformingToTypeIdentifier("public.image") {
        NSLog("Attachment is public.image; handling image.")
        await self.handleImage(item: firstAttachment)
      } else if firstAttachment.hasItemConformingToTypeIdentifier("public.url") {
        NSLog("Attachment is public.url; handling URL.")
        await self.handleUrl(item: firstAttachment)
      } else {
        NSLog("Attachment has unrecognized type; completing.")
        self.completeRequest()
      }
    }
  }

  private func handleText(item: NSItemProvider) async {
    NSLog("In handleText...")
    do {
      if let data = try await item.loadItem(forTypeIdentifier: "public.text") as? String {
        NSLog("Loaded text: \(data.prefix(100))...") // Log first 100 chars
        if let encoded = data.addingPercentEncoding(withAllowedCharacters: .urlHostAllowed),
           let url = URL(string: "\(appScheme)://new?text=\(encoded)") {
          NSLog("Constructed URL: \(url.absoluteString)")
          openInContainerApp(url)
          return
        }
      }
      NSLog("Could not load or encode text. Completing.")
      completeRequest()
    } catch {
      NSLog("handleText error: \(error)")
      completeRequest()
    }
  }

  private func handleUrl(item: NSItemProvider) async {
    NSLog("In handleUrl...")
    do {
      if let data = try await item.loadItem(forTypeIdentifier: "public.url") as? URL {
        NSLog("Loaded URL from extension: \(data)")
        if let encoded = data.absoluteString.addingPercentEncoding(withAllowedCharacters: .urlHostAllowed),
           let url = URL(string: "\(appScheme)://new?text=\(encoded)") {
          NSLog("Constructed custom scheme URL: \(url.absoluteString)")
          openInContainerApp(url)
          return
        }
      }
      NSLog("Could not load or encode URL. Completing.")
      completeRequest()
    } catch {
      NSLog("handleUrl error: \(error)")
      completeRequest()
    }
  }

  private func handleImage(item: NSItemProvider) async {
    NSLog("In handleImage...")
    var valid = true
    var imageUriInfo: String?

    do {
      if let dataUri = try await item.loadItem(forTypeIdentifier: "public.image") as? URL {
        NSLog("Got a dataUri: \(dataUri.absoluteString)")
        let data = try Data(contentsOf: dataUri)
        NSLog("Data size: \(data.count)")
        let image = UIImage(data: data)
        imageUriInfo = saveImageWithInfo(image)
      } else if let image = try await item.loadItem(forTypeIdentifier: "public.image") as? UIImage {
        NSLog("Got a UIImage in-memory")
        imageUriInfo = saveImageWithInfo(image)
      }
    } catch {
      NSLog("handleImage error: \(error)")
      valid = false
    }

    if valid,
       let imageUriInfo = imageUriInfo,
       let encoded = imageUriInfo.addingPercentEncoding(withAllowedCharacters: .urlHostAllowed),
       let url = URL(string: "\(appScheme)://new?imageUri=\(encoded)") {
      NSLog("Constructed custom scheme URL for image: \(url.absoluteString)")
      openInContainerApp(url)
    } else {
      NSLog("Image handling invalid or no imageUriInfo. Completing.")
      completeRequest()
    }
  }

  private func saveImageWithInfo(_ image: UIImage?) -> String? {
    guard let image = image else { return nil }
    NSLog("Saving image to app group...")

    do {
      if let dir = FileManager().containerURL(forSecurityApplicationGroupIdentifier: appGroup) {
        let filePath = "\(dir.absoluteString)\(ProcessInfo.processInfo.globallyUniqueString).jpeg"
        NSLog("File path: \(filePath)")
        if let newUri = URL(string: filePath),
           let jpegData = image.jpegData(compressionQuality: 1) {
          try jpegData.write(to: newUri)
          NSLog("Wrote image successfully to \(newUri.absoluteString)")
          return "\(newUri.absoluteString)|\(image.size.width)|\(image.size.height)"
        }
      }
      NSLog("No containerURL or could not write.")
      return nil
    } catch {
      NSLog("Error writing image: \(error)")
      return nil
    }
  }

  private func completeRequest() {
    NSLog("completeRequest called. Dismissing share extension.")
    extensionContext?.completeRequest(returningItems: nil)
  }

  @objc func openInContainerApp(_ url: URL) -> Bool {
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