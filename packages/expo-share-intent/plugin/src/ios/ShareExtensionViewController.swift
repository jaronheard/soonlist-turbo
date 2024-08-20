import MobileCoreServices
import Photos
import Security
import Social
import UIKit
import UniformTypeIdentifiers
import os.log
import UserNotifications

struct AuthData {
  let userId: String
  let username: String
  let authToken: String
  let expoPushToken: String
}

class ShareViewController: UIViewController {
  let imageContentType = kUTTypeImage as String
  let videoContentType = kUTTypeMovie as String
  let textContentType = kUTTypeText as String
  let urlContentType = kUTTypeURL as String
  let fileURLType = kUTTypeFileURL as String

  override func viewDidAppear(_ animated: Bool) {
    super.viewDidAppear(animated)
    NSLog("soonlist.share-extension.shareviewcontroller: viewDidAppear called")

    // Dismiss the UI
    self.dismiss(animated: true) {
      NSLog("soonlist.share-extension.shareviewcontroller: Dismissed UI")
    }
    
    // Perform the share operation in the background
    DispatchQueue.global(qos: .userInitiated).async {
      NSLog("soonlist.share-extension.shareviewcontroller: Performing share operation in the background")
      self.performShare()

      // Complete the request when done
      DispatchQueue.main.async {
        NSLog("soonlist.share-extension.shareviewcontroller: Completing request on the main queue")
        self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
      }
    }
  }

  func performShare() {
    NSLog("soonlist.share-extension.shareviewcontroller: Attempting to perform share")
    guard let authData = loadAuthData() else {
      NSLog("soonlist.share-extension.shareviewcontroller: Failed to load auth data in performShare()")
      sendLoginNotification()
      return
    }

    NSLog(
      "soonlist.share-extension.shareviewcontroller: Successfully loaded auth data: userId=\(authData.userId), username=\(authData.username)"
    )

    logExtensionContext()

    if let content = extensionContext!.inputItems[0] as? NSExtensionItem {
      if let contents = content.attachments {
        for (index, attachment) in (contents).enumerated() {
          NSLog("soonlist.share-extension.shareviewcontroller: Processing attachment at index \(index)")
          if attachment.hasItemConformingToTypeIdentifier(imageContentType) {
            NSLog("soonlist.share-extension.shareviewcontroller: Attachment is an image")
            handleImages(content: content, attachment: attachment, index: index, authData: authData)
          } else if attachment.hasItemConformingToTypeIdentifier(textContentType) {
            NSLog("soonlist.share-extension.shareviewcontroller: Attachment is text")
            handleText(content: content, attachment: attachment, index: index, authData: authData)
          } else if attachment.hasItemConformingToTypeIdentifier(fileURLType) {
            NSLog("soonlist.share-extension.shareviewcontroller: Attachment is a file URL")
            handleUnsupportedType(type: "fileURL")
          } else if attachment.hasItemConformingToTypeIdentifier(urlContentType) {
            NSLog("soonlist.share-extension.shareviewcontroller: Attachment is a URL")
            handleUnsupportedType(type: "url")
          } else if attachment.hasItemConformingToTypeIdentifier(videoContentType) {
            NSLog("soonlist.share-extension.shareviewcontroller: Attachment is a video")
            handleUnsupportedType(type: "video")
          } else {
            NSLog("soonlist.share-extension.shareviewcontroller: Attachment is of unknown type")
            handleUnsupportedType(type: "unknown")
          }
        }
      } else {
        NSLog("soonlist.share-extension.shareviewcontroller: No attachments found in the extension item")
      }
    } else {
      NSLog("soonlist.share-extension.shareviewcontroller: No input items found in the extension context")
    }
  }

  private func logExtensionContext() {
    if let context = self.extensionContext {
      NSLog(
        "soonlist.share-extension.shareviewcontroller: Extension context - input items count: \(context.inputItems.count)"
      )
      for (index, item) in context.inputItems.enumerated() {
        if let extensionItem = item as? NSExtensionItem {
          NSLog(
            "soonlist.share-extension.shareviewcontroller: Input item \(index) - attachments count: \(extensionItem.attachments?.count ?? 0)"
          )
          NSLog(
            "soonlist.share-extension.shareviewcontroller: Input item \(index) - attributed content text: \(extensionItem.attributedContentText?.string ?? "nil")"
          )
        }
      }
    } else {
      NSLog("soonlist.share-extension.shareviewcontroller: Extension context is nil")
    }
  }

  private func handleImages(
    content: NSExtensionItem, attachment: NSItemProvider, index: Int, authData: AuthData
  ) {
    NSLog("soonlist.share-extension.shareviewcontroller: Performing automatic share with image")
    attachment.loadItem(forTypeIdentifier: imageContentType, options: nil) {
      [weak self] (imageData, error) in
      guard let self = self else { return }
      if let error = error {
        NSLog("soonlist.share-extension.shareviewcontroller: Error loading image data: \(error)")
        self.sendFailureNotification(authData: authData)
        self.extensionContext!.completeRequest(returningItems: [], completionHandler: nil)
        return
      }
      
      if let imageUrl = imageData as? URL {
        NSLog("soonlist.share-extension.shareviewcontroller: Image data loaded as URL: \(imageUrl)")
        self.resizeAndUploadImage(imageUrl) { uploadedImageUrl in
          guard !uploadedImageUrl.isEmpty else {
            NSLog("soonlist.share-extension.shareviewcontroller: Failed to upload image")
            self.sendFailureNotification(authData: authData)
            self.extensionContext!.completeRequest(returningItems: [], completionHandler: nil)
            return
          }

          NSLog("soonlist.share-extension.shareviewcontroller: Image uploaded successfully: \(uploadedImageUrl)")

          let event = PrototypeEventCreateImageSchema(
            json: PrototypeEventCreateImageSchema.EventData(
              imageUrl: uploadedImageUrl,
              timezone: TimeZone.current.identifier,
              expoPushToken: authData.expoPushToken,
              lists: [],
              userId: authData.userId,
              username: authData.username
            )
          )

          self.callAiEventFromImageThenCreateThenNotification(event: event) { result in
            switch result {
            case .success(let data):
              NSLog(
                "soonlist.share-extension.shareviewcontroller: Success: \(String(data: data, encoding: .utf8) ?? "")"
              )
            case .failure(let error):
              NSLog("soonlist.share-extension.shareviewcontroller: Error: \(error)")
              self.sendFailureNotification(authData: authData)
            }

            self.extensionContext!.completeRequest(returningItems: [], completionHandler: nil)
          }
        }
      } else {
        NSLog("soonlist.share-extension.shareviewcontroller: Failed to load image data")
        self.sendFailureNotification(authData: authData)
        self.extensionContext!.completeRequest(returningItems: [], completionHandler: nil)
      }
    }
  }

  private func handleText(
    content: NSExtensionItem, attachment: NSItemProvider, index: Int, authData: AuthData
  ) {
    NSLog(
      "soonlist.share-extension.shareviewcontroller: Performing automatic share with raw text")
    attachment.loadItem(forTypeIdentifier: textContentType, options: nil) {
      [weak self] (textData, error) in
      guard let self = self else { return }
      if let error = error {
        NSLog("soonlist.share-extension.shareviewcontroller: Error loading text data: \(error)")
        self.sendFailureNotification(authData: authData)
        self.extensionContext!.completeRequest(returningItems: [], completionHandler: nil)
        return
      }
      
      let rawText =
        (textData as? String) ?? content.attributedContentText?.string ?? "Event details"
      NSLog("soonlist.share-extension.shareviewcontroller: Raw text: \(rawText)")
      
      let event = PrototypeEventCreateRawTextSchema(
        json: PrototypeEventCreateRawTextSchema.EventData(
          rawText: rawText,
          timezone: TimeZone.current.identifier,
          expoPushToken: authData.expoPushToken,
          lists: [],
          userId: authData.userId,
          username: authData.username
        )
      )

      self.callAiEventFromRawTextThenCreateThenNotification(event: event) { result in
        switch result {
        case .success(let data):
          NSLog(
            "soonlist.share-extension.shareviewcontroller: Success: \(String(data: data, encoding: .utf8) ?? "")"
          )
        case .failure(let error):
          NSLog("soonlist.share-extension.shareviewcontroller: Error: \(error)")
          self.sendFailureNotification(authData: authData)
        }

        self.extensionContext!.completeRequest(returningItems: [], completionHandler: nil)
      }
    }
  }

  private func handleUnsupportedType(type: String) {
    NSLog("soonlist.share-extension.shareviewcontroller: Unsupported share type: \(type)")
  }

  // Define the method to call the API
  private func callAiEventFromRawTextThenCreateThenNotification(
    event: PrototypeEventCreateRawTextSchema, completion: @escaping (Result<Data, Error>) -> Void
  ) {
    NSLog("soonlist.share-extension.shareviewcontroller: Calling AI event from raw text")
    guard let domainURL = KeychainHelper.getValue(forKey: "EXPO_PUBLIC_API_BASE_URL") else {
      NSLog(
        "soonlist.share-extension.shareviewcontroller: Failed to load EXPO_PUBLIC_API_BASE_URL from Keychain"
      )
      return
    }

    guard
      let url = URL(
        string:
          "\(domainURL)/api/trpc/ai.eventFromRawTextThenCreateThenNotification"
      )
    else {
      NSLog("soonlist.share-extension.shareviewcontroller: Invalid URL")
      return
    }

    let jsonData: Data
    do {
      jsonData = try JSONEncoder().encode(event)
      NSLog(
        "soonlist.share-extension.shareviewcontroller: JSON Payload: \(String(data: jsonData, encoding: .utf8) ?? "")"
      )
    } catch {
      NSLog("soonlist.share-extension.shareviewcontroller: Error encoding JSON: \(error)")
      return
    }

    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")

    let task = URLSession.shared.uploadTask(with: request, from: jsonData) { data, response, error in
      if let error = error {
        NSLog("soonlist.share-extension.shareviewcontroller: Error in upload task: \(error)")
        completion(.failure(error))
        return
      }

      if let httpResponse = response as? HTTPURLResponse {
        NSLog(
          "soonlist.share-extension.shareviewcontroller: HTTP Status Code: \(httpResponse.statusCode)"
        )
        if httpResponse.statusCode != 200 {
          NSLog(
            "soonlist.share-extension.shareviewcontroller: Response Headers: \(httpResponse.allHeaderFields)"
          )
        }
      }

      guard let data = data else {
        NSLog("soonlist.share-extension.shareviewcontroller: No data received")
        return
      }

      if let responseString = String(data: data, encoding: .utf8) {
        NSLog("soonlist.share-extension.shareviewcontroller: Response: \(responseString)")
      }

      completion(.success(data))
    }

    task.resume()
  }

  func callAiEventFromImageThenCreateThenNotification(
    event: PrototypeEventCreateImageSchema, completion: @escaping (Result<Data, Error>) -> Void
  ) {
    NSLog("soonlist.share-extension.shareviewcontroller: Calling AI event from image")
    guard let domainURL = KeychainHelper.getValue(forKey: "EXPO_PUBLIC_API_BASE_URL") else {
      NSLog(
        "soonlist.share-extension.shareviewcontroller: Failed to load EXPO_PUBLIC_API_BASE_URL from Keychain"
      )
      return
    }

    guard
      let url = URL(
        string:
          "\(domainURL)/api/trpc/ai.eventFromImageThenCreateThenNotification"
      )
    else {
      NSLog("soonlist.share-extension.shareviewcontroller: Invalid URL")
      return
    }

    let jsonData: Data
    do {
      jsonData = try JSONEncoder().encode(event)
      NSLog(
        "soonlist.share-extension.shareviewcontroller: JSON Payload: \(String(data: jsonData, encoding: .utf8) ?? "")"
      )
    } catch {
      NSLog("soonlist.share-extension.shareviewcontroller: Error encoding JSON: \(error)")
      return
    }

    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")

    let task = URLSession.shared.uploadTask(with: request, from: jsonData) { data, response, error in
      if let error = error {
        NSLog("soonlist.share-extension.shareviewcontroller: Error in upload task: \(error)")
        completion(.failure(error))
        return
      }

      if let httpResponse = response as? HTTPURLResponse {
        NSLog(
          "soonlist.share-extension.shareviewcontroller: HTTP Status Code: \(httpResponse.statusCode)"
        )
        if httpResponse.statusCode != 200 {
          NSLog(
            "soonlist.share-extension.shareviewcontroller: Response Headers: \(httpResponse.allHeaderFields)"
          )
        }
      }

      guard let data = data else {
        NSLog("soonlist.share-extension.shareviewcontroller: No data received")
        return
      }

      if let responseString = String(data: data, encoding: .utf8) {
        NSLog("soonlist.share-extension.shareviewcontroller: Response: \(responseString)")
      }

      completion(.success(data))
    }

    task.resume()
  }

  private func handleImageUpload(
    _ imageItemProvider: NSItemProvider, completion: @escaping (String) -> Void
  ) {
    imageItemProvider.loadItem(forTypeIdentifier: UTType.image.identifier, options: nil) {
      (imageURL, error) in
      guard let imageURL = imageURL as? URL else {
        NSLog("soonlist.share-extension.shareviewcontroller: Failed to get image URL")
        completion("")
        return
      }

      self.resizeAndUploadImage(imageURL) { imageUrl in
        completion(imageUrl)
      }
    }
  }

  private func resizeAndUploadImage(_ imageURL: URL, completion: @escaping (String) -> Void) {
    NSLog("soonlist.share-extension.shareviewcontroller: Resizing and uploading image")
    guard let image = UIImage(contentsOfFile: imageURL.path) else {
      NSLog("soonlist.share-extension.shareviewcontroller: Failed to create UIImage from URL")
      completion("")
      return
    }

    let resizedImage = resizeImage(image, targetWidth: 1350)
    guard let jpegData = resizedImage.jpegData(compressionQuality: 0.8) else {
      NSLog("soonlist.share-extension.shareviewcontroller: Failed to convert image to JPEG")
      completion("")
      return
    }

    uploadImage(jpegData) { imageUrl in
      NSLog("soonlist.share-extension.shareviewcontroller: Image uploaded: \(imageUrl)")
      completion(imageUrl)
    }
  }

  private func resizeImage(_ image: UIImage, targetWidth: CGFloat) -> UIImage {
    let aspectRatio = image.size.height / image.size.width
    let targetHeight = targetWidth * aspectRatio
    let newSize = CGSize(width: targetWidth, height: targetHeight)

    UIGraphicsBeginImageContextWithOptions(newSize, false, 1.0)
    image.draw(in: CGRect(origin: .zero, size: newSize))
    let resizedImage = UIGraphicsGetImageFromCurrentImageContext()!
    UIGraphicsEndImageContext()

    return resizedImage
  }

  private func uploadImage(_ imageData: Data, completion: @escaping (String) -> Void) {
    NSLog("soonlist.share-extension.shareviewcontroller: Uploading image")
    guard let url = URL(string: "https://api.bytescale.com/v2/accounts/12a1yek/uploads/binary")
    else {
      NSLog("soonlist.share-extension.shareviewcontroller: Invalid URL")
      completion("")
      return
    }

    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue(
      "Bearer public_12a1yekATNiLj4VVnREZ8c7LM8V8", forHTTPHeaderField: "Authorization")
    request.setValue("image/jpeg", forHTTPHeaderField: "Content-Type")

    let task = URLSession.shared.uploadTask(with: request, from: imageData) { data, response, error in
      if let error = error {
        NSLog("soonlist.share-extension.shareviewcontroller: Error uploading image: \(error)")
        completion("")
        return
      }

      guard let data = data else {
        NSLog("soonlist.share-extension.shareviewcontroller: No data received from image upload")
        completion("")
        return
      }

      do {
        if let json = try JSONSerialization.jsonObject(with: data, options: []) as? [String: Any],
          let fileUrl = json["fileUrl"] as? String
        {
          NSLog(
            "soonlist.share-extension.shareviewcontroller: Uploaded image file path: \(fileUrl)")
          completion(fileUrl)
        } else {
          completion("")
        }
      } catch {
        NSLog("soonlist.share-extension.shareviewcontroller: Error parsing JSON response: \(error)")
        completion("")
      }
    }

    task.resume()
  }

  // Add this new method
  private func sendLoginNotification() {
    NSLog("soonlist.share-extension.shareviewcontroller: Sending login notification")
    guard let domainURL = KeychainHelper.getValue(forKey: "EXPO_PUBLIC_API_BASE_URL") else {
      NSLog("soonlist.share-extension.shareviewcontroller: Failed to load EXPO_PUBLIC_API_BASE_URL from Keychain")
      return
    }

    guard let url = URL(string: "\(domainURL)/api/trpc/notification.sendSingleNotification") else {
      NSLog("soonlist.share-extension.shareviewcontroller: Invalid URL")
      return
    }

    let notificationData: [String: Any] = [
      "expoPushToken": "",  // Leave this empty as we don't have a token
      "title": "Login Required",
      "body": "Please log in to save events to Soonlist",
      "data": [String: String]()
    ]

    guard let jsonData = try? JSONSerialization.data(withJSONObject: notificationData) else {
      NSLog("soonlist.share-extension.shareviewcontroller: Failed to serialize notification data")
      return
    }

    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")

    let task = URLSession.shared.uploadTask(with: request, from: jsonData) { data, response, error in
      if let error = error {
        NSLog("soonlist.share-extension.shareviewcontroller: Error sending notification: \(error)")
        return
      }

      if let httpResponse = response as? HTTPURLResponse {
        NSLog("soonlist.share-extension.shareviewcontroller: Notification HTTP Status Code: \(httpResponse.statusCode)")
      }

      if let data = data, let responseString = String(data: data, encoding: .utf8) {
        NSLog("soonlist.share-extension.shareviewcontroller: Notification Response: \(responseString)")
      }
    }

    task.resume()
  }

  // Add this new method
  private func sendFailureNotification(authData: AuthData) {
    NSLog("soonlist.share-extension.shareviewcontroller: Sending failure notification")
    guard let domainURL = KeychainHelper.getValue(forKey: "EXPO_PUBLIC_API_BASE_URL") else {
      NSLog("soonlist.share-extension.shareviewcontroller: Failed to load EXPO_PUBLIC_API_BASE_URL from Keychain")
      return
    }

    guard let url = URL(string: "\(domainURL)/api/trpc/notification.sendSingleNotification") else {
      NSLog("soonlist.share-extension.shareviewcontroller: Invalid URL")
      return
    }

    let notificationData: [String: Any] = [
      "expoPushToken": authData.expoPushToken,
      "title": "Event Creation Failed",
      "body": "We couldn't create your event. Please try again later.",
      "data": [String: String]()
    ]

    guard let jsonData = try? JSONSerialization.data(withJSONObject: notificationData) else {
      NSLog("soonlist.share-extension.shareviewcontroller: Failed to serialize notification data")
      return
    }

    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")

    let task = URLSession.shared.uploadTask(with: request, from: jsonData) { data, response, error in
      if let error = error {
        NSLog("soonlist.share-extension.shareviewcontroller: Error sending notification: \(error)")
        return
      }

      if let httpResponse = response as? HTTPURLResponse {
        NSLog("soonlist.share-extension.shareviewcontroller: Notification HTTP Status Code: \(httpResponse.statusCode)")
      }

      if let data = data, let responseString = String(data: data, encoding: .utf8) {
        NSLog("soonlist.share-extension.shareviewcontroller: Notification Response: \(responseString)")
      }
    }

    task.resume()
  }
}

struct PrototypeEventCreateRawTextSchema: Codable {
  let json: EventData

  struct EventData: Codable {
    let rawText: String
    let timezone: String
    let expoPushToken: String
    let lists: [String]
    let userId: String
    let username: String
  }
}

struct PrototypeEventCreateImageSchema: Codable {
  let json: EventData

  struct EventData: Codable {
    let imageUrl: String
    let timezone: String
    let expoPushToken: String
    let lists: [String]
    let userId: String
    let username: String
  }
}

class KeychainHelper {
  static func getValue(forKey key: String) -> String? {
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: "app:no-auth",
      kSecAttrAccount as String: key,
      kSecReturnData as String: true,
      kSecAttrAccessGroup as String: "group.com.soonlist",
    ]

    var item: CFTypeRef?
    let status = SecItemCopyMatching(query as CFDictionary, &item)

    guard status == errSecSuccess,
      let data = item as? Data,
      let value = String(data: data, encoding: .utf8)
    else {
      return nil
    }

    return value
  }
}

func loadAuthData() -> AuthData? {
  NSLog("soonlist.share-extension.shareviewcontroller: Attempting to load auth data from Keychain")

  logAllKeys()

  let query: [String: Any] = [
    kSecClass as String: kSecClassGenericPassword,
    kSecAttrAccessGroup as String: "group.com.soonlist",
    kSecReturnData as String: false,
  ]

  let status = SecItemCopyMatching(query as CFDictionary, nil)

  switch status {
  case errSecSuccess:
    NSLog("soonlist.share-extension.shareviewcontroller: Keychain is accessible")
  case errSecItemNotFound:
    NSLog(
      "soonlist.share-extension.shareviewcontroller: Keychain item not found. This may be normal if no data has been saved yet."
    )
  case errSecInteractionNotAllowed:
    NSLog(
      "soonlist.share-extension.shareviewcontroller: Keychain access not allowed. This might be due to device lock state."
    )
  case errSecAuthFailed:
    NSLog(
      "soonlist.share-extension.shareviewcontroller: Keychain authentication failed. Check entitlements and provisioning profile."
    )
  default:
    NSLog(
      "soonlist.share-extension.shareviewcontroller: Keychain is not accessible. Error: \(status)")
  }

  guard status == errSecSuccess else {
    return nil
  }

  guard let authDataString = KeychainHelper.getValue(forKey: "authData") else {
    NSLog(
      "soonlist.share-extension.shareviewcontroller: Failed to retrieve authData string from Keychain"
    )
    return nil
  }

  NSLog(
    "soonlist.share-extension.shareviewcontroller: Retrieved authData string: \(authDataString)")

  guard let authDataData = authDataString.data(using: .utf8) else {
    NSLog("soonlist.share-extension.shareviewcontroller: Failed to convert authData string to Data")
    return nil
  }

  do {
    if let authData = try JSONSerialization.jsonObject(with: authDataData, options: [])
      as? [String: String]
    {
      NSLog("soonlist.share-extension.shareviewcontroller: Successfully parsed authData JSON")

      guard let userId = authData["userId"],
        let username = authData["username"],
        let authToken = authData["authToken"],
        let expoPushToken = authData["expoPushToken"]
      else {
        NSLog(
          "soonlist.share-extension.shareviewcontroller: One or more required fields not found in authData"
        )
        return nil
      }

      NSLog(
        "soonlist.share-extension.shareviewcontroller: Successfully retrieved all required fields from authData"
      )
      return AuthData(
        userId: userId, username: username, authToken: authToken, expoPushToken: expoPushToken)
    } else {
      NSLog(
        "soonlist.share-extension.shareviewcontroller: Failed to cast parsed JSON to [String: String]"
      )
    }
  } catch {
    NSLog("soonlist.share-extension.shareviewcontroller: Error parsing authData JSON: \(error)")
  }

  NSLog("soonlist.share-extension.shareviewcontroller: Failed to load auth data")
  return nil
}

func logAllKeys() {
  NSLog("soonlist.share-extension.shareviewcontroller: Attempting to log all keychain items")

  let query: [String: Any] = [
    kSecClass as String: kSecClassGenericPassword,
    kSecReturnData as String: true,
    kSecReturnAttributes as String: true,
    kSecMatchLimit as String: kSecMatchLimitAll,
  ]

  var item: CFTypeRef?
  let status = SecItemCopyMatching(query as CFDictionary, &item)

  guard status != errSecItemNotFound else {
    NSLog("soonlist.share-extension.shareviewcontroller: No keychain items found")
    return
  }

  guard status == errSecSuccess else {
    NSLog("soonlist.share-extension.shareviewcontroller: Error fetching keychain items: \(status)")
    return
  }

  guard let existingItems = item as? [[String: Any]] else {
    NSLog("soonlist.share-extension.shareviewcontroller: Unexpected result type")
    return
  }

  for (index, existingItem) in existingItems.enumerated() {
    let account = existingItem[kSecAttrAccount as String] as? String ?? "Unknown Account"
    let passwordData = existingItem[kSecValueData as String] as? Data
    let password =
      passwordData != nil
      ? String(data: passwordData!, encoding: .utf8) ?? "Unable to decode" : "No password data"

    NSLog(
      "soonlist.share-extension.shareviewcontroller: Item \(index + 1): Account: \(account), Password: \(password)"
    )

    // Log all attributes for debugging
    for (key, value) in existingItem {
      NSLog("soonlist.share-extension.shareviewcontroller: Item \(index + 1) - \(key): \(value)")
    }
  }
}
