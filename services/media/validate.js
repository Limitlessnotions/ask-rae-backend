const IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const VIDEO_TYPES = [
  "video/mp4",
  "video/quicktime",
];

export function validateMedia(file) {
  if (!file) {
    throw new Error("Media file is required.");
  }

  const allowed = [
    ...IMAGE_TYPES,
    ...VIDEO_TYPES,
  ];

  if (!allowed.includes(file.mimetype)) {
    throw new Error(
      `Unsupported media type: ${file.mimetype}`
    );
  }

  return true;
}