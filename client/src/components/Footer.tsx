"use client";

import Link from "next/link";

const FOOTER_LINK_SECTIONS = [
  {
    title: "Services",
    links: [
      { label: "E-Books", href: "/dashboard/books" },
      { label: "Audiobooks", href: "/dashboard/books" },
      { label: "Local Events", href: "#about" },
    ],
  },
  {
    title: "Platform",
    links: [
      { label: "For Librarians", href: "/login" },
      { label: "API Access", href: "/login" },
      { label: "Mobile App", href: "/register" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Us", href: "#about" },
      { label: "Support", href: "mailto:support@mosa-library.local" },
      { label: "Contact", href: "mailto:contact@mosa-library.local" },
    ],
  },
];

const FOOTER_SOCIAL_LINKS = [
  { icon: "public", href: "/" },
  { icon: "rss_feed", href: "#browse" },
  { icon: "alternate_email", href: "mailto:contact@mosa-library.local" },
];

export function Footer() {
  return (
    <footer className="border-t border-[#f0f2f4] bg-white px-4 py-12 transition-colors duration-300 dark:border-gray-800 dark:bg-[#101622] sm:px-6 md:px-10">
      <div className="mx-auto w-full max-w-[1200px]">
        <div className="grid gap-8 grid-cols-2 md:grid-cols-4">
          <div>
            <Link href="/" className="inline-flex items-center gap-2 text-[#2b6cee] transition-transform duration-300 hover:scale-105">
              <div className="size-6">
                <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M24 4C25.7818 14.2173 33.7827 22.2182 44 24C33.7827 25.7818 25.7818 33.7827 24 44C22.2182 33.7827 14.2173 25.7818 4 24C14.2173 22.2182 22.2182 14.2173 24 4Z"
                    fill="currentColor"
                  />
                </svg>
              </div>
              <span className="font-extrabold text-[#111318] dark:text-white">Mosa</span>
            </Link>
            <p className="mt-3 text-xs font-normal leading-relaxed text-[#616f89] dark:text-gray-400">
              Your gateway to world&apos;s knowledge. Access millions of titles from 500+ partnered local libraries.
            </p>
          </div>

          {FOOTER_LINK_SECTIONS.map((section) => (
            <div key={section.title}>
              <h3 className="mb-4 text-sm font-bold leading-normal text-[#111318] dark:text-white">
                {section.title}
              </h3>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-xs font-normal leading-normal text-[#616f89] transition-all duration-300 hover:text-[#2b6cee] dark:text-gray-400"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between border-t border-[#f0f2f4] pt-8 dark:border-gray-800 md:flex-row">
          <p className="text-xs font-normal leading-relaxed text-[#616f89] dark:text-gray-400">
            © 2026 Mosa Library Platform. All rights reserved.
          </p>

          <div className="mt-6 flex items-center gap-4 md:mt-0">
            {FOOTER_SOCIAL_LINKS.map((link) => (
              <Link
                key={link.icon}
                href={link.href}
                className="flex size-10 items-center justify-center rounded-full border border-gray-200 text-[#616f89] transition-all duration-300 hover:border-[#2b6cee] hover:text-[#2b6cee] dark:border-gray-700 dark:hover:border-[#2b6cee]"
                aria-label={link.icon}
              >
                <span className="material-symbols-outlined">{link.icon}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
