interface TitleBarProps {
  title: string;
  onClose?: () => void;
  closeLabel?: string;
}

export function TitleBar({ title, onClose, closeLabel }: TitleBarProps) {
  return (
    <div className="titlebar">
      {onClose && (
        <button
          type="button"
          className="closebox"
          onClick={onClose}
          aria-label={closeLabel}
          title={closeLabel}
        />
      )}
      <h2 className="titlebar-text">{title}</h2>
    </div>
  );
}
