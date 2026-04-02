export function ResizeHandle() {
  return (
    <div
      aria-hidden="true"
      className="resize-handle"
      data-testid="resize-handle"
    >
      <span className="resize-handle__grip" />
    </div>
  );
}
