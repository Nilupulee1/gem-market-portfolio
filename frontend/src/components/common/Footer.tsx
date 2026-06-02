import logo from '../../assets/logo.png';

const Footer = () => {
	return (
		<>
			<div className="lux-footer-top">
				<div>
					<div className="lux-footer-brand">
						<img src={logo} alt="GemFolio" className="lux-footer-logo" />
						<p className="lux-footer-title">GemFolio</p>
					</div>
					<p className="lux-footer-copy">
						The trusted marketplace for certified gemstones, secure auctions, and transparent trading.
					</p>
				</div>
			</div>

			<div className="lux-footer-bottom">
				<p>© 2026 GemFolio. All rights reserved.</p>
			</div>
		</>
	);
};

export default Footer;
