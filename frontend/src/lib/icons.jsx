export function Verified({ size = 18 }) {
  return (
    <svg className="verif" width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 1.6l2.6 2.1 3.3-.3 1 3.2 2.9 1.7-1.1 3.1 1.1 3.1-2.9 1.7-1 3.2-3.3-.3L12 22.4l-2.6-2.1-3.3.3-1-3.2L2.2 13.7l1.1-3.1L2.2 7.5l2.9-1.7 1-3.2 3.3.3z" />
      <path d="M8.2 12.2l2.4 2.4 5-5" fill="none" stroke="#0A0908" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function XLogo(props) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path d="M18.9 2H22l-7.6 8.7L23 22h-6.6l-5.2-6.8L5.3 22H2.2l8.1-9.3L1.6 2h6.8l4.7 6.2L18.9 2zm-1.2 18h1.8L7 3.9H5.1L17.7 20z" />
    </svg>
  );
}
