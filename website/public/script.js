(() => {
	"use strict";

	const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
	const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
	const $ = (selector, root = document) => root.querySelector(selector);
	const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

	/* ---------- Header: scroll state, reading progress, current section ---------- */

	const header = $("#site-header");
	const navLinks = $$(".site-nav a[href^='#']");
	let progressFrame = 0;

	const updateProgress = () => {
		progressFrame = 0;
		const doc = document.documentElement;
		const max = doc.scrollHeight - doc.clientHeight;
		const ratio = max > 0 ? Math.min(1, window.scrollY / max) : 0;
		header.style.setProperty("--progress", ratio.toFixed(4));
		header.classList.toggle("is-scrolled", window.scrollY > 8);
	};

	window.addEventListener(
		"scroll",
		() => {
			if (!progressFrame) progressFrame = requestAnimationFrame(updateProgress);
		},
		{ passive: true },
	);
	updateProgress();

	if ("IntersectionObserver" in window && navLinks.length) {
		const sections = navLinks.map((link) => $(link.getAttribute("href"))).filter(Boolean);
		const current = new Set();
		const sectionObserver = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) current.add(entry.target.id);
					else current.delete(entry.target.id);
				}
				let active = null;
				for (const section of sections) {
					if (current.has(section.id)) active = section.id;
				}
				for (const link of navLinks) {
					link.classList.toggle("is-current", link.getAttribute("href") === `#${active}`);
				}
			},
			{ rootMargin: "-40% 0px -50% 0px" },
		);
		sections.forEach((section) => sectionObserver.observe(section));
	}

	/* ---------- Mobile menu ---------- */

	const menuToggle = $(".menu-toggle");
	const nav = $("#site-nav");

	const setMenu = (open) => {
		menuToggle.setAttribute("aria-expanded", String(open));
		menuToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
		nav.classList.toggle("is-open", open);
	};

	if (menuToggle && nav) {
		menuToggle.addEventListener("click", () => setMenu(menuToggle.getAttribute("aria-expanded") !== "true"));
		nav.addEventListener("click", (event) => {
			if (event.target.closest("a")) setMenu(false);
		});
		document.addEventListener("keydown", (event) => {
			if (event.key === "Escape" && nav.classList.contains("is-open")) {
				setMenu(false);
				menuToggle.focus();
			}
		});
		document.addEventListener("click", (event) => {
			if (nav.classList.contains("is-open") && !event.target.closest(".site-header")) setMenu(false);
		});
	}

	/* ---------- Scroll reveal ---------- */

	const revealTargets = $$("[data-reveal]");
	for (const group of $$("[data-reveal-stagger]")) {
		Array.from(group.children).forEach((child, index) => child.style.setProperty("--i", index));
	}

	if ("IntersectionObserver" in window && !reduceMotion.matches) {
		const revealObserver = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						entry.target.classList.add("is-visible");
						revealObserver.unobserve(entry.target);
					}
				}
			},
			{ threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
		);
		revealTargets.forEach((el) => revealObserver.observe(el));
	} else {
		revealTargets.forEach((el) => el.classList.add("is-visible"));
	}

	/* ---------- Hero: send love ---------- */

	const showcase = $("#hero-showcase");
	const heroDevice = $("#hero-device");
	const loveNote = $(".floating-note-love");
	const loveStatus = $("#love-status");
	let loveCount = 0;
	let loveResetTimer = 0;

	const spawnHearts = (origin) => {
		if (!showcase || reduceMotion.matches) return;
		const bounds = showcase.getBoundingClientRect();
		const from = origin.getBoundingClientRect();
		const x = from.left + from.width / 2 - bounds.left;
		const y = from.top + from.height / 2 - bounds.top;
		const count = 9 + Math.floor(Math.random() * 4);
		for (let i = 0; i < count; i++) {
			const heart = document.createElement("span");
			heart.className = "heart-particle";
			heart.textContent = "♥";
			heart.style.left = `${x}px`;
			heart.style.top = `${y}px`;
			heart.style.setProperty("--dx", `${(Math.random() - 0.5) * 200}px`);
			heart.style.setProperty("--dy", `${120 + Math.random() * 180}px`);
			heart.style.setProperty("--rot", `${(Math.random() - 0.5) * 70}deg`);
			heart.style.setProperty("--size", `${0.9 + Math.random() * 1.2}rem`);
			heart.style.setProperty("--dur", `${1100 + Math.random() * 700}ms`);
			heart.style.animationDelay = `${Math.random() * 120}ms`;
			heart.style.color = Math.random() > 0.7 ? "#ff8ba4" : "";
			heart.addEventListener("animationend", () => heart.remove(), { once: true });
			showcase.appendChild(heart);
		}
	};

	const sendLove = (origin) => {
		loveCount += 1;
		spawnHearts(origin);
		if (loveNote) {
			loveNote.classList.add("is-sent");
			$("strong", loveNote).textContent = "Love sent";
		}
		if (loveStatus) {
			loveStatus.textContent = loveCount === 1 ? "Jamie · just now" : `Jamie · ×${loveCount} today`;
		}
		if (heroDevice) {
			heroDevice.classList.remove("is-loved");
			void heroDevice.offsetWidth;
			heroDevice.classList.add("is-loved");
		}
		clearTimeout(loveResetTimer);
		loveResetTimer = window.setTimeout(() => {
			if (loveNote) $("strong", loveNote).textContent = "Send more?";
		}, 4000);
	};

	for (const trigger of $$("[data-love]")) {
		trigger.addEventListener("click", () => sendLove(trigger));
	}

	/* ---------- Hero: capacity slider ---------- */

	const range = $("#capacity-range");
	const capacityValue = $("#capacity-value");
	const capacityLabel = $("#capacity-label");
	const capacityNote = $(".floating-note-capacity");

	const labelFor = (value) => {
		if (value <= 25) return "Running low — could use extra gentleness today";
		if (value <= 50) return "Limited capacity right now";
		if (value <= 75) return "Doing okay";
		return "Feeling good — ready to be of service to you";
	};

	const updateCapacity = () => {
		const value = Number(range.value);
		const color = `hsl(${Math.round(value * 1.2)} 65% 42%)`;
		capacityValue.textContent = String(value);
		capacityLabel.textContent = labelFor(value);
		capacityNote.style.setProperty("--cap-color", color);
		capacityNote.style.setProperty("--cap-pct", `${value}%`);
	};

	if (range && capacityValue && capacityLabel && capacityNote) {
		range.addEventListener("input", updateCapacity);
		updateCapacity();
	}

	/* ---------- Hero: pointer tilt ---------- */

	if (showcase && heroDevice && finePointer.matches && !reduceMotion.matches) {
		let tiltFrame = 0;
		let pointer = null;

		const applyTilt = () => {
			tiltFrame = 0;
			if (!pointer) return;
			const bounds = showcase.getBoundingClientRect();
			const dx = (pointer.x - bounds.left) / bounds.width - 0.5;
			const dy = (pointer.y - bounds.top) / bounds.height - 0.5;
			heroDevice.style.setProperty("--tilt-y", `${(dx * 10).toFixed(2)}deg`);
			heroDevice.style.setProperty("--tilt-x", `${(-dy * 8).toFixed(2)}deg`);
		};

		showcase.addEventListener("pointermove", (event) => {
			if (event.pointerType !== "mouse") return;
			pointer = { x: event.clientX, y: event.clientY };
			heroDevice.classList.add("is-tilting");
			if (!tiltFrame) tiltFrame = requestAnimationFrame(applyTilt);
		});

		showcase.addEventListener("pointerleave", () => {
			pointer = null;
			heroDevice.classList.remove("is-tilting");
			heroDevice.style.setProperty("--tilt-x", "0deg");
			heroDevice.style.setProperty("--tilt-y", "0deg");
		});
	}

	/* ---------- Notes: mini checklist ---------- */

	const miniList = $("#mini-list");
	if (miniList) {
		const boxes = $$("input[type='checkbox']", miniList);
		const progress = $("#list-progress");
		const bar = $("#list-bar");
		const hint = $("#list-hint");
		let touched = false;

		const hintFor = (done, total) => {
			if (done === total) return "All done. Jamie says thanks ♥";
			if (!touched) return "Go on, tick one off.";
			if (done === 0) return "Fresh list. Where do you want to start?";
			if (done === total - 1) return "Almost there.";
			return "Nice. Jamie will see that.";
		};

		const updateList = () => {
			const done = boxes.filter((box) => box.checked).length;
			const total = boxes.length;
			progress.textContent = `${done} of ${total} done`;
			bar.style.width = `${(done / total) * 100}%`;
			miniList.classList.toggle("is-complete", done === total);
			hint.textContent = hintFor(done, total);
		};

		boxes.forEach((box) =>
			box.addEventListener("change", () => {
				touched = true;
				updateList();
			}),
		);
		updateList();
	}

	/* ---------- Install: platform tabs ---------- */

	const switcher = $(".install-switch");
	if (switcher) {
		const tabs = $$("[role='tab']", switcher);
		const panels = tabs.map((tab) => $(`#${tab.getAttribute("aria-controls")}`));

		const activate = (index, focus = false) => {
			tabs.forEach((tab, i) => {
				const active = i === index;
				tab.classList.toggle("is-active", active);
				tab.setAttribute("aria-selected", String(active));
				tab.tabIndex = active ? 0 : -1;
				if (panels[i]) {
					panels[i].classList.toggle("is-active", active);
					if (active) {
						// Restart the step-in animation.
						panels[i].querySelectorAll("li").forEach((li) => {
							li.style.animation = "none";
							void li.offsetWidth;
							li.style.animation = "";
						});
					}
				}
			});
			switcher.dataset.active = tabs[index].id.replace("tab-", "");
			if (focus) tabs[index].focus();
		};

		tabs.forEach((tab, index) => {
			tab.addEventListener("click", () => activate(index));
			tab.addEventListener("keydown", (event) => {
				if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
					event.preventDefault();
					const next = (index + (event.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length;
					activate(next, true);
				}
			});
		});

		// Pre-select the visitor's likely platform.
		if (/android/i.test(navigator.userAgent)) activate(1);
	}
})();
