const SUPPORT_X = "https://x.com/nscribed";
const WEBSITE = "https://nscribed.xyz";

export default function Footer() {
  return (
    <footer>
      <div className="foot-in">
        <div className="foot-sig"><span className="slash">//</span> BY BLOCKHEADS</div>
        <div className="foot-row">
          <div className="links-f">
            <a href={SUPPORT_X} target="_blank" rel="noreferrer" data-testid="footer-support">Support</a>
            <a href={SUPPORT_X} target="_blank" rel="noreferrer" data-testid="footer-x">X / Twitter</a>
            <a href={WEBSITE} target="_blank" rel="noreferrer" data-testid="footer-website">nscribed.xyz</a>
          </div>
          <div className="copy">© 2026 nscribed — an inscribed identity</div>
        </div>
        <div className="foot-note">Need help? Reach us on X at <a href={SUPPORT_X} target="_blank" rel="noreferrer">@nscribed</a></div>
      </div>
    </footer>
  );
}
