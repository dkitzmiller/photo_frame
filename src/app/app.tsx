import { useEffect, useState, useRef, useCallback } from 'react';
import styles from './app.module.css';

// Types
interface ImagePair {
  frame: string;
  photo: string;
}

export function App() {
  const [isRunning, setIsRunning] = useState(false);
  const [buttonLabel, setButtonLabel] = useState('Start');
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [usedPhotos, setUsedPhotos] = useState<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timerRef = useRef<NodeJS.Timeout>();

  // Get these from environment variables
  const DISPLAY_TIME = parseInt(import.meta.env.VITE_DISPLAY_TIME || '30000'); // 30 seconds default
  const frames = Array.from({ length: 8 }, (_, i) => `/src/resources/photo_stock/frames/${String(i + 1).padStart(2, '0')}.png`);
  const photos = [
    '/src/resources/photo_stock/photos/IMG_0479.JPG',
    '/src/resources/photo_stock/photos/IMG_0893.jpg',
    '/src/resources/photo_stock/photos/backlit.jpg',
    '/src/resources/photo_stock/photos/bigwhite.JPG',
    '/src/resources/photo_stock/photos/goldenpeony.jpg',
    '/src/resources/photo_stock/photos/groupranaculars.JPG',
    '/src/resources/photo_stock/photos/inthepink.JPG',
    '/src/resources/photo_stock/photos/japaneseranuculus.JPG',
    '/src/resources/photo_stock/photos/master_light_glowtop.JPG',
    '/src/resources/photo_stock/photos/parrot_tulip_red.JPG',
    '/src/resources/photo_stock/photos/red_flower.JPG',
    '/src/resources/photo_stock/photos/verigated.JPG'
  ];

  const getRandomImage = (): ImagePair | null => {
    const unusedPhotos = photos.filter(photo => !usedPhotos.has(photo));
    if (unusedPhotos.length === 0) return null;

    const randomPhoto = unusedPhotos[Math.floor(Math.random() * unusedPhotos.length)];
    const randomFrame = frames[Math.floor(Math.random() * frames.length)];

    return { frame: randomFrame, photo: randomPhoto };
  };

  const combineImages = async (framePath: string, photoPath: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas= canvasRef.current;
      if (!canvas) return reject('Canvas not found');

      const ctx = canvas.getContext('2d');
      if (!ctx) return reject('Could not get canvas context');

      const frame = new Image();
      const photo = new Image();

      frame.onload = () => {
        canvas.width = frame.width;
        canvas.height = frame.height;

        photo.onload = () => {
          // Calculate dimensions to fit photo within frame
          const frameRatio = frame.width / frame.height;
          const photoRatio = photo.width / photo.height;

          let drawWidth = frame.width * 0.8; // 80% of frame width
          let drawHeight = frame.height * 0.8; // 80% of frame height

          if (photoRatio > frameRatio) {
            drawHeight = drawWidth / photoRatio;
          } else {
            drawWidth = drawHeight * photoRatio;
          }

          const x = (frame.width - drawWidth) / 2;
          const y = (frame.height - drawHeight) / 2;

          // Draw photo first
          ctx.drawImage(photo, x, y, drawWidth, drawHeight);
          // Draw frame on top
          ctx.drawImage(frame, 0, 0, frame.width, frame.height);

          resolve(canvas.toDataURL('image/jpeg'));
        };
        photo.src = photoPath;
      };
      frame.src = framePath;
    });
  };

  const startTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    setTimeLeft(Math.floor(DISPLAY_TIME / 1000));

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [DISPLAY_TIME]);

  const handleNextImage = async () => {
    const nextPair = getRandomImage();
    if (!nextPair) {
      setIsRunning(false);
      setButtonLabel('Exit');
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      document.title = 'Photo Frame';
      return;
    }

    try {
      const combinedImage = await combineImages(nextPair.frame, nextPair.photo);
      setCurrentImage(combinedImage);
      setUsedPhotos(prev => new Set([...prev, nextPair.photo]));

      if (isRunning) {
        startTimer();
      }
    } catch (error) {
      console.error('Error combining images:', error);
    }
  };

  const handleButtonClick = () => {
    if (buttonLabel === 'Exit') {
      window.close();
      return;
    }

    setIsRunning(true);
    setButtonLabel('');
    startTimer();
  };

  const handleImageClick = () => {
    if (isRunning) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      handleNextImage();
    }
  };

  // Update document title when timeLeft changes
  useEffect(() => {
    if (timeLeft > 0) {
      document.title = `Photo Frame ... ${timeLeft}`;
    } else if (isRunning) {
      handleNextImage();
    }
  }, [timeLeft, isRunning]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Generate initial image when component mounts
  useEffect(() => {
    handleNextImage();
    document.title = 'Photo Frame';
  }, []);

  return (
    <div className={styles.container}>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      {currentImage && (
        <div
          className={styles.imageContainer}
          onClick={handleImageClick}
          style={{ cursor: isRunning ? 'pointer' : 'default' }}
        >
          <img src={currentImage} alt="Framed Photo" className={styles.framedImage} />
        </div>
      )}
      {buttonLabel && (
        <button onClick={handleButtonClick} className={styles.button}>
          {buttonLabel}
        </button>
      )}
    </div>
  );
}

export default App;
