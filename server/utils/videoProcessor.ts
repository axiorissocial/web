import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs-extra';
import path from 'path';

export interface VideoProcessingResult {
  hlsPath: string;
  thumbnailPath: string;
  duration: number;
  resolution: {
    width: number;
    height: number;
  };
}

export class VideoProcessor {
  private static readonly HLS_SEGMENT_DURATION = 10;
  private static readonly THUMBNAIL_TIME = '00:00:01';

  static async processToHLS(
    inputPath: string,
    outputDir: string,
    filename: string
  ): Promise<VideoProcessingResult> {
    await fs.ensureDir(outputDir);

    const baseOutputPath = path.join(outputDir, filename);
    const hlsOutputPath = `${baseOutputPath}.m3u8`;
    const thumbnailPath = `${baseOutputPath}_thumb.jpg`;

    const metadata = await this.getVideoMetadata(inputPath);

    await this.generateThumbnail(inputPath, thumbnailPath);

    await this.convertToHLS(inputPath, hlsOutputPath, metadata);

    return {
      hlsPath: hlsOutputPath,
      thumbnailPath,
      duration: metadata.duration,
      resolution: metadata.resolution
    };
  }

  static async convertHLSToMP4(
    hlsPath: string,
    outputPath: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(hlsPath)
        .outputOptions([
          '-c copy',
          '-bsf:a aac_adtstoasc'
        ])
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .run();
    });
  }

  private static async getVideoMetadata(inputPath: string): Promise<{
    duration: number;
    resolution: { width: number; height: number };
  }> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (err, metadata) => {
        if (err) return reject(err);

        const videoStream = metadata.streams.find(s => s.codec_type === 'video');
        if (!videoStream) return reject(new Error('No video stream found'));

        resolve({
          duration: metadata.format.duration || 0,
          resolution: {
            width: videoStream.width || 0,
            height: videoStream.height || 0
          }
        });
      });
    });
  }

  private static async generateThumbnail(
    inputPath: string,
    outputPath: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .seekInput(this.THUMBNAIL_TIME)
        .frames(1)
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .run();
    });
  }

  private static async convertToHLS(
    inputPath: string,
    outputPath: string,
    metadata: { resolution: { width: number; height: number } }
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const { width, height } = metadata.resolution;
      
      const qualities = this.determineQualityLevels(width, height);
      
      let command = ffmpeg(inputPath);

      qualities.forEach((quality, index) => {
        const segmentPath = outputPath.replace('.m3u8', `_${quality.name}_%03d.ts`);
        const playlistPath = outputPath.replace('.m3u8', `_${quality.name}.m3u8`);
        
        command = command
          .addOutput(playlistPath)
          .outputOptions([
            '-c:v libx264',
            '-c:a aac',
            `-b:v ${quality.videoBitrate}`,
            `-maxrate ${quality.videoBitrate}`,
            `-bufsize ${quality.bufferSize}`,
            `-s ${quality.resolution}`,
            `-b:a ${quality.audioBitrate}`,
            '-f hls',
            `-hls_time ${this.HLS_SEGMENT_DURATION}`,
            '-hls_list_size 0',
            `-hls_segment_filename ${segmentPath}`,
            '-preset fast',
            '-profile:v main'
          ]);
      });

      command
        .on('end', async () => {
          try {
            await this.createMasterPlaylist(outputPath, qualities);
            resolve();
          } catch (err) {
            reject(err);
          }
        })
        .on('error', (err) => reject(err))
        .run();
    });
  }

  private static determineQualityLevels(width: number, height: number) {
    const qualities = [];

    if (height >= 1080) {
      qualities.push({
        name: '1080p',
        resolution: '1920x1080',
        videoBitrate: '5000k',
        audioBitrate: '128k',
        bufferSize: '10000k'
      });
    }

    if (height >= 720) {
      qualities.push({
        name: '720p',
        resolution: '1280x720',
        videoBitrate: '2500k',
        audioBitrate: '128k',
        bufferSize: '5000k'
      });
    }

    if (height >= 480) {
      qualities.push({
        name: '480p',
        resolution: '854x480',
        videoBitrate: '1000k',
        audioBitrate: '96k',
        bufferSize: '2000k'
      });
    }

    qualities.push({
      name: '360p',
      resolution: '640x360',
      videoBitrate: '500k',
      audioBitrate: '96k',
      bufferSize: '1000k'
    });

    return qualities;
  }

  private static async createMasterPlaylist(
    masterPath: string,
    qualities: any[]
  ): Promise<void> {
    let masterContent = '#EXTM3U\n#EXT-X-VERSION:3\n\n';

    qualities.forEach(quality => {
      const bandwidth = parseInt(quality.videoBitrate.replace('k', '')) * 1000;
      const playlistName = path.basename(masterPath).replace('.m3u8', `_${quality.name}.m3u8`);
      
      masterContent += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${quality.resolution}\n`;
      masterContent += `${playlistName}\n`;
    });

    await fs.writeFile(masterPath, masterContent);
  }

  static async cleanupVideoFiles(mediaItem: any): Promise<void> {
    if (mediaItem.type !== 'video') return;

    try {
      const basePath = mediaItem.url.replace('.m3u8', '');
      const dir = path.dirname(mediaItem.url);
      
      const files = await fs.readdir(dir);
      const relatedFiles = files.filter(file => 
        file.startsWith(path.basename(basePath)) ||
        file.includes(path.basename(basePath))
      );

      await Promise.all(
        relatedFiles.map(file => 
          fs.remove(path.join(dir, file)).catch(() => {})
        )
      );
    } catch (error) {
      console.error('Error cleaning up video files:', error);
    }
  }
}