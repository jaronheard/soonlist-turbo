import UIKit

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
           let url = URL(string: "\(self.appScheme)://new?intent=new&text=\(encoded)") {
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
           let url = URL(string: "\(self.appScheme)://new?intent=new&text=\(encoded)") {
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
            let image = UIImage(data: data)
            imageUriInfo = self.saveImageWithInfo(image)
        } else if let image = try await item.loadItem(forTypeIdentifier: "public.image") as? UIImage {
            imageUriInfo = self.saveImageWithInfo(image)
        }
    } catch {
        valid = false
    }

    if valid,
       let imageUriInfo = imageUriInfo,
       let encoded = imageUriInfo.addingPercentEncoding(withAllowedCharacters: .urlHostAllowed),
       let url = URL(string: "\(self.appScheme)://new?intent=new&imageUri=\(encoded)") {
        _ = self.openURL(url)
    }

    self.completeRequest()
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