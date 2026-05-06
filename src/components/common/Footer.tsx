import { Link } from 'react-router-dom';
import { Facebook, Instagram, Linkedin, Twitter, Youtube } from 'lucide-react';
import logo from '../../assets/logo.png';

const footerLinks = {
	marketplace: [
		{ label: 'Browse Gems', href: '/' },
		{ label: 'Live Auctions', href: '/login' },
		{ label: 'Featured Sellers', href: '/login' },
		{ label: 'New Arrivals', href: '/' },
	],
	resources: [
		{ label: 'How It Works', href: '/#how-it-works' },
		{ label: 'Verification Guide', href: '/login' },
		{ label: 'Shipping Info', href: '/login' },
		{ label: 'Support Center', href: '/login' },
	],
};

const socialLinks = [
	{ icon: Facebook, href: '#', label: 'Facebook' },
	{ icon: Twitter, href: '#', label: 'Twitter' },
	{ icon: Instagram, href: '#', label: 'Instagram' },
	{ icon: Linkedin, href: '#', label: 'LinkedIn' },
	{ icon: Youtube, href: '#', label: 'YouTube' },
];

const Footer = () => {
	return (
		<footer className="lux-footer">
			<div className="lux-footer-top">
				<div>
					<div className="lux-footer-brand">
						<img src={logo} alt="GemFolio" className="lux-footer-logo" />
						<div>
							<p className="lux-footer-title">GemFolio</p>
							<p className="lux-footer-subtitle">Premium gemstone marketplace</p>
						</div>
					</div>
					<p className="lux-footer-copy">
						The trusted marketplace for certified gemstones, secure auctions, and transparent trading.
					</p>
					<div className="lux-footer-socials">
						{socialLinks.map((social) => {
							const Icon = social.icon;
							return (
								<a key={social.label} href={social.href} className="lux-social-link" aria-label={social.label}>
									<Icon size={16} />
								</a>
							);
						})}
					</div>
				</div>

				<div className="lux-footer-columns">
					<div>
						<h3>Marketplace</h3>
						<ul>
							{footerLinks.marketplace.map((link) => (
								<li key={link.label}>
									<Link to={link.href}>{link.label}</Link>
								</li>
							))}
						</ul>
					</div>

					<div>
						<h3>Resources</h3>
						<ul>
							{footerLinks.resources.map((link) => (
								<li key={link.label}>
									<Link to={link.href}>{link.label}</Link>
								</li>
							))}
						</ul>
					</div>
				</div>
			</div>

			<div className="lux-footer-bottom">
				<p>© 2026 GemFolio. All rights reserved.</p>
				<div className="lux-footer-bottom-links">
					<Link to="/login">Privacy</Link>
					<Link to="/login">Terms</Link>
					<Link to="/login">Cookies</Link>
				</div>
			</div>
		</footer>
	);
};

export default Footer;
