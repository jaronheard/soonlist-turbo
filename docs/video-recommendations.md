# Demo Video Format & Compression Recommendations

## Recommended Video Settings

### Format
- **Container**: MP4 (H.264)
- **Codec**: H.264/AVC
- **Resolution**: 720p (1280x720) or 1080p (1920x1080)
- **Frame Rate**: 30 fps
- **Bitrate**: 1-2 Mbps for 720p, 2-4 Mbps for 1080p

### Audio
- **Codec**: AAC
- **Bitrate**: 128 kbps
- **Sample Rate**: 44.1 kHz

### Compression Tips
1. Use HandBrake or FFmpeg for compression
2. Target file size: 5-10 MB for a 30-60 second demo
3. Use variable bitrate (VBR) encoding for better quality/size ratio

### FFmpeg Command Example
```bash
ffmpeg -i input.mp4 -c:v libx264 -preset slow -crf 23 -c:a aac -b:a 128k -movflags +faststart output.mp4
```

### Optimization for Mobile
- Enable "Fast Start" (moves metadata to beginning of file)
- Consider creating multiple versions for different network conditions
- Test on both iOS and Android devices

## Updating the Video

1. Upload your compressed video to your CDN (e.g., Bytescale, Cloudinary)
2. Copy the direct video URL
3. Update in Convex Dashboard:
   - Go to Data tab
   - Find `appConfig` table
   - Add/update record with:
     - key: "demoVideoUrl"
     - value: "https://your-cdn.com/your-video.mp4"
     - updatedAt: current ISO timestamp

The app will automatically use the new video URL without requiring an app update.