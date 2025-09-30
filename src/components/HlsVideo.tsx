import React, { useRef, useEffect } from 'react';
import Hls from 'hls.js';

interface HlsVideoProps extends React.VideoHTMLAttributes<HTMLVideoElement> {
  src?: string;
  hlsSrc?: string;
}

const HlsVideo: React.FC<HlsVideoProps> = ({ src, hlsSrc, ...props }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;

    const useHls = !!hlsSrc && Hls.isSupported();

    if (useHls) {
      hls = new Hls();
      hls.attachMedia(video);
      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        if (hlsSrc) hls!.loadSource(hlsSrc);
      });
    } else {
      if (hlsSrc) {
        video.src = hlsSrc;
      } else if (src) {
        video.src = src;
      }
    }

    return () => {
      if (hls) {
        hls.destroy();
        hls = null;
      }
    };
  }, [src, hlsSrc]);

  return (
    <video ref={videoRef} {...props}>
      {src ? <source src={src} /> : null}
      Your browser does not support the video tag.
    </video>
  );
};

export default HlsVideo;
