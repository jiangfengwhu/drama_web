import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  EMOTION_SLIDER_EMOJIS,
  EMOTION_SLIDER_SEND_LABEL,
  EMOTION_SLIDER_TITLE,
  FREE_FORM_MODE_LABEL,
} from '../../constants/interaction.const';
import './EmotionSliderInput.css';

interface EmotionSliderInputProps {
  lines: string[];
  disabled?: boolean;
  onSubmit: (line: string) => void;
  onFreeForm: () => void;
}

function indexFromSliderValue(value: number, count: number): number {
  if (count <= 1) return 0;
  return Math.round((value / 100) * (count - 1));
}

export function EmotionSliderInput({
  lines,
  disabled,
  onSubmit,
  onFreeForm,
}: EmotionSliderInputProps) {
  const [sliderValue, setSliderValue] = useState(50);
  const previewRef = useRef<HTMLDivElement>(null);

  const activeIndex = useMemo(
    () => indexFromSliderValue(sliderValue, lines.length),
    [sliderValue, lines.length],
  );

  const activeLine = lines[activeIndex] ?? '';
  const activeEmoji = EMOTION_SLIDER_EMOJIS[activeIndex] ?? EMOTION_SLIDER_EMOJIS[0];

  const handleSubmit = useCallback(() => {
    if (!activeLine.trim() || disabled) return;
    onSubmit(activeLine);
  }, [activeLine, disabled, onSubmit]);

  useEffect(() => {
    if (!previewRef.current) return;
    previewRef.current.scrollLeft = 0;
  }, [activeIndex]);

  return (
    <div className="emotion-slider emotion-slider--enter">
      <div className="emotion-slider__header">
        <div className="emotion-slider__intro">
          <p className="emotion-slider__title">{EMOTION_SLIDER_TITLE}</p>
        </div>
        <button
          type="button"
          className="emotion-slider__free-btn"
          disabled={disabled}
          onClick={onFreeForm}
        >
          {FREE_FORM_MODE_LABEL}
        </button>
      </div>

      <div className="emotion-slider__action-row">
        <div
          ref={previewRef}
          className="emotion-slider__preview"
          aria-live="polite"
        >
          <p key={activeIndex} className="emotion-slider__preview-line">
            {activeLine}
          </p>
        </div>

        <button
          type="button"
          className="emotion-slider__send"
          disabled={disabled || !activeLine.trim()}
          onClick={handleSubmit}
        >
          {EMOTION_SLIDER_SEND_LABEL}
        </button>
      </div>

      <div className="emotion-slider__track-wrap">
        <div
          className="emotion-slider__track-inner"
          style={{ '--pct': sliderValue / 100 } as CSSProperties}
        >
          <div className="emotion-slider__track-fill" aria-hidden />
          <div className="emotion-slider__thumb-emoji" aria-hidden>
            {activeEmoji}
          </div>
          <input
            type="range"
            className="emotion-slider__range"
            min={0}
            max={100}
            step={1}
            value={sliderValue}
            disabled={disabled}
            aria-valuemin={0}
            aria-valuemax={lines.length - 1}
            aria-valuenow={activeIndex}
            aria-valuetext={activeLine}
            onChange={(event) => setSliderValue(Number(event.target.value))}
          />
        </div>
      </div>
    </div>
  );
}
