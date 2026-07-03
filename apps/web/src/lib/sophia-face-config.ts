export const SOPHIA_FACE_CONFIG = {
  portraitWidth: 1024,
  portraitHeight: 1536,
  objectFit: "cover",
  objectPosition: "center top",
  // Portrait-space anchor measured against Sophia Avatar v1, below the nose and centered on the visible lips.
  mouthCenterX: 512,
  mouthCenterY: 424,
  mouthWidth: 52,
  mouthHeight: 10,
  transformOrigin: "center center",
  speakingScale: 1.15,
} as const;

export function projectSophiaMouthToStage(stage: { width: number; height: number }) {
  // Mirrors CSS object-fit: cover with object-position: center top so the overlay follows the cropped portrait.
  const scale = Math.max(stage.width / SOPHIA_FACE_CONFIG.portraitWidth, stage.height / SOPHIA_FACE_CONFIG.portraitHeight);
  const renderedWidth = SOPHIA_FACE_CONFIG.portraitWidth * scale;
  const offsetX = (stage.width - renderedWidth) / 2;
  return {
    centerX: offsetX + SOPHIA_FACE_CONFIG.mouthCenterX * scale,
    centerY: SOPHIA_FACE_CONFIG.mouthCenterY * scale,
    width: SOPHIA_FACE_CONFIG.mouthWidth * scale,
    height: SOPHIA_FACE_CONFIG.mouthHeight * scale,
  };
}
