// components/layout/Header.tsx
"use client";

import React, { useEffect, useState, useRef } from "react";
import { Link, usePathname, useRouter } from "@/navigation";
import Image from "next/image";
import HeaderAuth from "./HeaderAuth";
import { useLocale, useTranslations } from "next-intl";


export default function Header() {
  const t = useTranslations("HomePage");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  
  const changeLanguage = (lang: string) => {
    router.replace(pathname, { locale: lang });
    
  };

  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const loginDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      const header = document.querySelector(".main-header");

      if (window.scrollY > 50) {
        header?.classList.add("sticky");
      } else {
        header?.classList.remove("sticky");
      }
    };

    // Check on mount
    handleScroll();

    // Add scroll listener
    window.addEventListener("scroll", handleScroll, { passive: true });

    // Cleanup
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Close Login dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        loginDropdownRef.current &&
        !loginDropdownRef.current.contains(event.target as Node)
      ) {
        setIsLoginOpen(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const toggleLoginDropdown = () => {
    setIsLoginOpen((prev) => !prev);
  };

  return (
    <header className="main-header">
      {/* Top Bar */}
      <div className="top-bar">
        <div className="tb-controls">
          <a href="javascript:void(0);">{t("Skip to main content")}</a>
          <a
            href="javascript:void(0);"
            className="tp-btn tp-btn-sm ms-3"
            id="decreaseFont"
          >
            -A
          </a>
          <a
            href="javascript:void(0);"
            className="tp-btn tp-btn-sm ms-1"
            id="resetFont"
          >
            A
          </a>
          <a
            href="javascript:void(0);"
            className="tp-btn tp-btn-sm ms-1"
            id="increaseFont"
          >
            A+
          </a>
          <a
            href="https://investuttarakhand.uk.gov.in/site/screenReader"
            className="tp-btn tp-btn-bg ms-1"
          >
            <Image
              src="/img/icons/icon-sra.svg"
              alt="Screen Reader"
              width={16}
              height={16}
              className="me-1"
            />
            <span>{t("Screen Render Access")}</span>
          </a>
          <div id="google_translate_element"></div>
        </div>

        <div className="tb-contacts">
          <p className="d-none d-sm-block">
            {t("Helpdesk")} (10:00 AM to 5:00 PM IST)
            <span className="ms-2 me-2">|</span>
            {t("Toll Free")} : <a href="tel:+91-7618544555">+91-7618544555</a>
            <span className="ms-2 me-2">|</span>
            {t("Email")} : <a href="mailto:mpr@doiuk.org">mpr@doiuk.org</a>
          </p>
          <div className="tci-wrap">
            <p className="top-contact-info">
              <span>{t("Helpdesk")} (10:00 AM to 5:00 PM IST)</span>
              <span>
                {t("Email")} : <a href="mailto:mpr@doiuk.org">mpr@doiuk.org</a>
              </span>
              <span>
                {t("Toll Free")} : <a href="tel:+91-7617576903">+91-7617576903</a>
              </span>
            </p>
          </div>
          <select
            className="lang-control"
            value={locale}
            onChange={(e) => changeLanguage(e.target.value)}
          >
            <option value="en">Eng</option>
            <option value="hi">Hin</option>
          </select>
        </div>
      </div>

      {/* Logo and Login Section */}
      <nav className="navbar navbar-expand-lg bg-white">
        <div className="container-fluid">
          <div className="logo-wrap">
            <Link
              className="navbar-brand nb-iu"
              href="https://investuttarakhand.uk.gov.in"
            >
              <Image
                src="/img/logo-main.png"
                alt="Single Window Clearances System Uttarakhand"
                width={219}
                height={40}
              />
            </Link>
            <Link
              className="navbar-brand"
              href="https://investuttarakhand.uk.gov.in/investorsummit/"
              target="_blank"
            >
              <Image
                src="/img/logo-gis.png"
                alt="Global Investor Summit"
                width={146}
                height={40}
              />
            </Link>
          </div>

          

          <HeaderAuth/>

          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarScroll"
            aria-controls="navbarScroll"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </nav>

      {/* Main Navigation */}
      <nav className="navbar navbar-expand-lg bg-nav">
        <div className="container-fluid">
          <div className="collapse navbar-collapse" id="navbarScroll">
            <ul className="navbar-nav ms-auto me-auto my-2 my-lg-0 navbar-nav-scroll">
              {/* Home */}
              <li className="nav-item">
                <Link
                  className="nav-link active"
                  href="https://investuttarakhand.uk.gov.in"
                >
                  {t("Home")}
                </Link>
              </li>

              {/* Why Uttarakhand */}
              <li className="nav-item dropdown">
                <a
                  className="nav-link dropdown-toggle"
                  href="#"
                  id="whyUttarakhand"
                  role="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                   {t("Why Uttarakhand")}
                </a>
                <ul className="dropdown-menu" aria-labelledby="whyUttarakhand">
                  <li>
                    <a
                      className="dropdown-item"
                      href="https://investuttarakhand.uk.gov.in/site/yourGateWayToGrowth"
                    >
                       {t("Your Gateway to Growth")}
                    </a>
                  </li>
                  <li>
                    <a
                      className="dropdown-item"
                      href="https://investuttarakhand.uk.gov.in/site/ourStrength"
                    >
                       {t("Our Strengths")}
                    </a>
                  </li>
                  <li>
                    <a
                      className="dropdown-item"
                      href="https://investuttarakhand.uk.gov.in/site/preferredDestination"
                    >
                       {t("Preferred Investment Destination")}
                    </a>
                  </li>
                  <li>
                    <a
                      className="dropdown-item"
                      href="https://investuttarakhand.uk.gov.in/site/ranking"
                    >
                       {t("Ranking and Recognitions")}
                    </a>
                  </li>
                </ul>
              </li>

              {/* About Us */}
              <li className="nav-item dropdown">
                <a
                  className="nav-link dropdown-toggle"
                  href="#"
                  id="aboutUs"
                  role="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                   {t("About Us")}
                </a>
                <ul
                  className="dropdown-menu justify-content-start"
                  aria-labelledby="aboutUs"
                >
                  <li>
                    <a
                      className="dropdown-item"
                      href="https://investuttarakhand.uk.gov.in/check-status"
                    >
                       {t("Track In-Principle(CAF) Status")}
                    </a>
                  </li>
                  <li>
                    <a
                      className="dropdown-item"
                      href="https://investuttarakhand.uk.gov.in/check-service-status"
                    >
                       {t("Track Service Status")}
                    </a>
                  </li>
                  <li>
                    <a
                      className="dropdown-item"
                      href="https://investuttarakhand.uk.gov.in/site/investibleProjects"
                    >
                       {t("Investible Projects")}
                    </a>
                  </li>
                  <li>
                    <a
                      className="dropdown-item"
                      href="https://investuttarakhand.uk.gov.in/investmenttracking"
                      target="_blank"
                    >
                       {t("Submit Intent to Invest")}
                    </a>
                  </li>
                  <li>
                    <a className="dropdown-item" href="/site/knowYourIncentive">
                       {t("Know Your Incentives")}
                    </a>
                  </li>
                  <li>
                    <a
                      className="dropdown-item"
                      href="https://investuttarakhand.uk.gov.in/backoffice/iloc/property/listing/landtype/Pvt"
                    >
                       {t("Land Bank")}
                    </a>
                  </li>
                  <li>
                    <a
                      className="dropdown-item"
                      href="https://investuttarakhand.uk.gov.in/site/ServiceListingNew/iw/Y/id/ALL"
                    >
                       {t("Service Details")}
                    </a>
                  </li>
                  <li>
                    <a
                      className="dropdown-item"
                      href="https://investuttarakhand.uk.gov.in/site/sectoralclearances"
                    >
                       {t("Sectoral Approvals/Clearances")}
                    </a>
                  </li>
                  <li>
                    <a
                      className="dropdown-item"
                      href="https://investuttarakhand.uk.gov.in/site/udyogmitra"
                    >
                       {t("Udyog Mitra")}
                    </a>
                  </li>
                  <li>
                    <a
                      className="dropdown-item"
                      href="https://investuttarakhand.uk.gov.in/site/bestpracticeDashboard"
                    >
                       {t("Best Practices Dashboard")}
                    </a>
                  </li>
                  <li>
                    <a
                      className="dropdown-item"
                      href="https://investuttarakhand.uk.gov.in/site/servicesectordashoard"
                    >
                       {t("Service Sector Dashboard")}
                    </a>
                  </li>
                </ul>
              </li>

              {/* Services */}
              <li className="nav-item dropdown">
                <a
                  className="nav-link dropdown-toggle"
                  href="#"
                  id="services"
                  role="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                   {t("Services")}
                </a>
                <ul
                  className="dropdown-menu justify-content-start"
                  aria-labelledby="services"
                >
                  <li>
                    <a
                      className="dropdown-item"
                      href="https://investuttarakhand.uk.gov.in/site/ActsRulesNotifications"
                    >
                       {t("Act, Rule & Notification")}
                    </a>
                  </li>
                  <li>
                    <a
                      className="dropdown-item"
                      href="https://investuttarakhand.uk.gov.in/site/Policies"
                    >
                       {t("Policies, Schemes & Guidelines")}
                    </a>
                  </li>
                  <li>
                    <a
                      className="dropdown-item"
                      href="https://investuttarakhand.uk.gov.in/site/taxesDuties"
                    >
                       {t("Taxes, Duties & Fees")}
                    </a>
                  </li>
                  <li>
                    <a
                      className="dropdown-item"
                      href="https://investuttarakhand.uk.gov.in/site/reforms"
                    >
                       {t("Reforms Undertaken by Departments")}
                    </a>
                  </li>
                  <li>
                    <a
                      className="dropdown-item"
                      href="https://investuttarakhand.uk.gov.in/site/waterTariff"
                    >
                       {t("Water tariff Dashboard")}
                    </a>
                  </li>
                  <li>
                    <a
                      className="dropdown-item"
                      href="https://investuttarakhand.uk.gov.in/site/userManual"
                    >
                       {t("User Manuals")}
                    </a>
                  </li>
                  <li>
                    <a
                      className="dropdown-item"
                      href="https://investuttarakhand.uk.gov.in/site/faqPage"
                    >
                       {t("FAQs")}
                    </a>
                  </li>
                  <li>
                    <a
                      className="dropdown-item"
                      href="/themes/backend/uploads/Mapping-of-Schemes_Missions-of-Government-of-India.pdf"
                      target="_blank"
                    >
                       {t("Quality Standards Norms")}
                    </a>
                  </li>
                  <li>
                    <a
                      className="dropdown-item"
                      href="https://investuttarakhand.uk.gov.in/site/importantLink"
                    >
                       {t("Other Important Links")}
                    </a>
                  </li>
                  <li>
                    <a
                      className="dropdown-item"
                      href="https://investuttarakhand.uk.gov.in/site/performa"
                    >
                       {t("Proforma/Documents")}
                    </a>
                  </li>
                </ul>
              </li>

              {/* Departments */}
              <li className="nav-item dropdown">
                <a
                  className="nav-link dropdown-toggle"
                  href="#"
                  id="departments"
                  role="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                   {t("Departments")}
                </a>
                <ul
                  className="dropdown-menu justify-content-start"
                  aria-labelledby="departments"
                >
                  <li>
                    <a
                      className="dropdown-item"
                      href="https://investuttarakhand.uk.gov.in/site/CafNewDashboardv2"
                    >
                       {t("Approved Investment Proposal(CAF)")}
                    </a>
                  </li>
                  <li>
                    <a
                      className="dropdown-item"
                      href="https://investuttarakhand.uk.gov.in/site/inspectionSchedule"
                    >
                       {t("Inspection Reports")}
                    </a>
                  </li>
                  <li>
                    <a className="dropdown-item" href="/incentiveDashboard">
                       {t("Incentive Dashboard")}
                    </a>
                  </li>
                  <li>
                    <a
                      className="dropdown-item"
                      href="https://investuttarakhand.uk.gov.in/site/idsStatus"
                    >
                       {t("IDS Claim Status")}
                    </a>
                  </li>
                  <li>
                    <a
                      className="dropdown-item"
                      href="https://investuttarakhand.uk.gov.in/site/decriminalisationDashboard"
                    >
                       {t("Decriminalisation Dashboard")}
                    </a>
                  </li>
                  <li>
                    <a
                      className="dropdown-item"
                      href="/site/feedbackSurveyReport"
                    >
                       {t("Feedback Survey Report")}
                    </a>
                  </li>
                  <li>
                    <a
                      className="dropdown-item"
                      href="https://investuttarakhand.uk.gov.in/greviance/psindex/s/T"
                    >
                       {t("Grievances Dashboard")}
                    </a>
                  </li>
                </ul>
              </li>

              {/* Land */}
              <li className="nav-item dropdown">
                <a
                  className="nav-link dropdown-toggle"
                  href="#"
                  id="land"
                  role="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                   {t("Land")}
                </a>
                <ul className="dropdown-menu" aria-labelledby="land">
                  <li>
                    <a
                      className="dropdown-item"
                      href="https://investuttarakhand.uk.gov.in/site/msmeOfficersList"
                    >
                       {t("Who's Who")}
                    </a>
                  </li>
                  <li>
                    <a
                      className="dropdown-item"
                      href="https://investuttarakhand.uk.gov.in/site/dmlist"
                    >
                       {t("DM's")}
                    </a>
                  </li>
                  <li>
                    <a
                      className="dropdown-item"
                      href="https://investuttarakhand.uk.gov.in/site/listgm"
                    >
                       {t("GM-DICs")}
                    </a>
                  </li>
                  <li>
                    <a
                      className="dropdown-item"
                      href="https://investuttarakhand.uk.gov.in/site/deptNodalList/type/state"
                    >
                       {t("Department Nodals")}
                    </a>
                  </li>
                  <li>
                    <a
                      className="dropdown-item"
                      href="https://investuttarakhand.uk.gov.in/site/rm"
                    >
                       {t("Relationship Managers")}
                    </a>
                  </li>
                </ul>
              </li>

              {/* KYA */}
              <li className="nav-item dropdown">
                <a
                  className="nav-link dropdown-toggle"
                  href="#"
                  id="kya"
                  role="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                   {t("KYA")}
                </a>
                <ul className="dropdown-menu" aria-labelledby="kya">
                  <li>
                    <a
                      className="dropdown-item"
                      href="https://investuttarakhand.uk.gov.in/swcs/sample/one/action/signin"
                    >
                       {t("Tickets")}
                    </a>
                  </li>
                  <li>
                    <a
                      className="dropdown-item"
                      href="https://investuttarakhand.uk.gov.in/swcs/sample/one/action/signin"
                    >
                       {t("Grievances")}
                    </a>
                  </li>
                  <li>
                    <a
                      className="dropdown-item"
                      href="https://investuttarakhand.uk.gov.in/swcs/sample/one/action/signin"
                    >
                      {t("Queries")}
                    </a>
                  </li>
                  <li>
                    <a
                      className="dropdown-item"
                      href="https://investuttarakhand.uk.gov.in/faq"
                    >
                       {t("FAQ")}
                    </a>
                  </li>
                </ul>
              </li>

              {/* NSWS */}
              <li className="nav-item dropdown">
                <a
                  className="nav-link dropdown-toggle"
                  href="#"
                  id="nsws"
                  role="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                   {t("NSWS")}
                </a>
                <ul className="dropdown-menu" aria-labelledby="nsws">
                  <li>
                    <a
                      className="dropdown-item"
                      href="https://investuttarakhand.uk.gov.in/swcs/sample/one/action/signin"
                    >
                       {t("Tickets")}
                    </a>
                  </li>
                  <li>
                    <a
                      className="dropdown-item"
                      href="https://investuttarakhand.uk.gov.in/swcs/sample/one/action/signin"
                    >
                       {t("Grievances")}
                    </a>
                  </li>
                  <li>
                    <a
                      className="dropdown-item"
                      href="https://investuttarakhand.uk.gov.in/swcs/sample/one/action/signin"
                    >
                       {t("Queries")}
                    </a>
                  </li>
                  <li>
                    <a
                      className="dropdown-item"
                      href="https://investuttarakhand.uk.gov.in/faq"
                    >
                       {t("FAQ")}
                    </a>
                  </li>
                </ul>
              </li>

              {/* EODB */}
              <li className="nav-item dropdown">
                <a
                  className="nav-link dropdown-toggle"
                  href="#"
                  id="eodb"
                  role="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                   {t("EODB")}
                </a>
                <ul className="dropdown-menu" aria-labelledby="eodb">
                  <li>
                    <a
                      className="dropdown-item"
                      href="https://investuttarakhand.uk.gov.in/swcs/sample/one/action/signin"
                    >
                       {t("Tickets")}
                    </a>
                  </li>
                  <li>
                    <a
                      className="dropdown-item"
                      href="https://investuttarakhand.uk.gov.in/swcs/sample/one/action/signin"
                    >
                       {t("Grievances")}
                    </a>
                  </li>
                  <li>
                    <a
                      className="dropdown-item"
                      href="https://investuttarakhand.uk.gov.in/swcs/sample/one/action/signin"
                    >
                       {t("Queries")}
                    </a>
                  </li>
                  <li>
                    <a
                      className="dropdown-item"
                      href="https://investuttarakhand.uk.gov.in/faq"
                    >
                       {t("FAQ")}
                    </a>
                  </li>
                </ul>
              </li>

              {/* Information */}
              <li className="nav-item dropdown">
                <a
                  className="nav-link dropdown-toggle"
                  href="#"
                  id="information"
                  role="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                   {t("Information")}
                </a>
                <ul className="dropdown-menu" aria-labelledby="information">
                  <li>
                    <a className="dropdown-item" href="/know-your-incentive">
                      Know Your Incentive
                    </a>
                  </li>
                  <li>
                    <a className="dropdown-item" href="/incentive-calculator">
                      Incentive Calculator
                    </a>
                  </li>
                  <li>
                    <a
                      className="dropdown-item"
                      href="https://investuttarakhand.uk.gov.in/swcs/sample/one/action/signin"
                    >
                       {t("Tickets")}
                    </a>
                  </li>
                  <li>
                    <a
                      className="dropdown-item"
                      href="https://investuttarakhand.uk.gov.in/swcs/sample/one/action/signin"
                    >
                       {t("Grievances")}
                    </a>
                  </li>
                  <li>
                    <a
                      className="dropdown-item"
                      href="https://investuttarakhand.uk.gov.in/swcs/sample/one/action/signin"
                    >
                       {t("Queries")}
                    </a>
                  </li>
                  <li>
                    <a
                      className="dropdown-item"
                      href="https://investuttarakhand.uk.gov.in/faq"
                    >
                       {t("FAQ")}
                    </a>
                  </li>
                </ul>
              </li>

              {/* Support & Guidance */}
              <li className="nav-item dropdown">
                <a
                  className="nav-link dropdown-toggle"
                  href="#"
                  id="support"
                  role="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                   {t("Support & Guidance")}
                </a>
                <ul className="dropdown-menu" aria-labelledby="support">
                  <li>
                    <a
                      className="dropdown-item"
                      href="https://investuttarakhand.uk.gov.in/swcs/sample/one/action/signin"
                    >
                       {t("Tickets")}
                    </a>
                  </li>
                  <li>
                    <a
                      className="dropdown-item"
                      href="https://investuttarakhand.uk.gov.in/swcs/sample/one/action/signin"
                    >
                       {t("Grievances")}
                    </a>
                  </li>
                  <li>
                    <a
                      className="dropdown-item"
                      href="https://investuttarakhand.uk.gov.in/swcs/sample/one/action/signin"
                    >
                       {t("Queries")}
                    </a>
                  </li>
                  <li>
                    <a
                      className="dropdown-item"
                      href="https://investuttarakhand.uk.gov.in/faq"
                    >
                       {t("FAQ")}
                    </a>
                  </li>
                </ul>
              </li>
            </ul>
          </div>
        </div>
      </nav>
    </header>
  );
}
