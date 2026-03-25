// components/layout/Footer.tsx
import React from 'react'
import { Link } from '@/navigation'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
const Footer = () => {
  const t = useTranslations('Footer')
  return (
    <footer className="main-footer">
      <div className="container">
        <div className="row mb-5">
          <div className="col-sm-12 col-md-4">
            <Link href="https://investuttarakhand.uk.gov.in">
              <Image 
                src="/img/logo-main-w.png" 
                alt="Single Window Clearances System Uttarakhand"
                width={219}
                height={40}
              />
            </Link>
            <p className="mt-4 mb-4 mb-sm-0">
              {t("Directorate of Industries,Patel Nagar,Industrial Area, Dehradun, Uttarakhand, 248001")}
            </p>
          </div>
          <div className="col-sm-12 col-md-6 offset-md-2">
            <div className="d-flex justify-content-between align-items-center">
              <a href="#" className="px-3 px-sm-0">
                <Image 
                  src="/img/departments/msme.png" 
                  alt="MSME" 
                  width={80}
                  height={80}
                  className="w-100"
                />
              </a>
              <a href="#" className="px-3 px-sm-0">
                <Image 
                  src="/img/departments/ukpcb.png" 
                  alt="Uttarakhand Petrol Control Board"
                  width={80}
                  height={80}
                  className="w-100"
                />
              </a>
              <a href="#" className="px-3 px-sm-0">
                <Image 
                  src="/img/departments/digital-india.png" 
                  alt="Digital India"
                  width={80}
                  height={80}
                  className="w-100"
                />
              </a>
              <a href="#" className="px-3 px-sm-0">
                <Image 
                  src="/img/departments/startup-uk.png" 
                  alt="Startup Uttarakhand"
                  width={80}
                  height={80}
                  className="w-100"
                />
              </a>
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-sm-12 col-md-3">
            <h3 className="mb-3">{t("About Us")}</h3>
            <ul>
              <li><a href="#">{t("Guidance Uttarakhand")}</a></li>
              <li><a href="#">{t("MSME")}</a></li>
              <li><a href="#">{t("Events")}</a></li>
              <li><a href="#">{t("Testimonials")}</a></li>
              <li><a href="#">{t("Privacy Policy")}</a></li>
            </ul>
          </div>
          <div className="col-sm-12 col-md-3">
            <h3 className="mb-3">{t("Clearances/Approvals")}</h3>
            <ul>
              <li><a href="#">{t("How to Apply")}</a></li>
              <li><a href="#">{t("List of Clearances")}</a></li>
              <li><a href="#">{t("Know Your Clearances")}</a></li>
              <li><a href="#">{t("Verify Certificate")}</a></li>
              <li><a href="#">{t("Best Practices")}</a></li>
            </ul>
          </div>
          <div className="col-sm-12 col-md-3">
            <h3 className="mb-3">{t("Help & Support")}</h3>
            <ul>
              <li><a href="#">{t("User Manual")}</a></li>
              <li><a href="#">{t("FAQs")}</a></li>
              <li><a href="#">{t("Raise Your Queries")}</a></li>
              <li><a href="#">{t("Contact Us")}</a></li>
              <li><a href="#">{t("Useful Links & Downloads")}</a></li>
            </ul>
          </div>
          <div className="col-sm-12 col-md-3">
            <h3 className="mb-3">{t("Other Links")}</h3>
            <ul>
              <li>
                <a href="https://investuttarakhand.uk.gov.in/site/brapMandate" target="_blank" rel="noopener noreferrer">
                  {t("BRAP 2024 Mandates")}
                </a>
              </li>
              <li>
                <a href="https://investuttarakhand.uk.gov.in/mis/backend/web/mis/mis/l1" target="_blank" rel="noopener noreferrer">
                  {t("MIS Dashboard")}
                </a>
              </li>
              <li>
                <a href="https://startuputtarakhand.uk.gov.in/" target="_blank" rel="noopener noreferrer">
                  {t("Startup Uttarakhand")}
                </a>
              </li>
              <li>
                <a href="https://investuttarakhand.uk.gov.in/filmshooting" target="_blank" rel="noopener noreferrer">
                  {t("Film Shooting")}
                </a>
              </li>
              <li>
                <a href="https://investuttarakhand.uk.gov.in/site/importantLink" target="_blank" rel="noopener noreferrer">
                  {t("View More")}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="d-flex justify-content-between align-items-center mt-5 flex-column flex-md-row">
          <div className="social-wrap d-flex">
            <a href="#" className="me-3">
              <Image src="/img/icons/facebook.svg" alt="Facebook" width={24} height={24} />
            </a>
            <a href="#" className="me-3">
              <Image src="/img/icons/linkedin.svg" alt="Linkedin" width={24} height={24} />
            </a>
            <a href="#">
              <Image src="/img/icons/instagram.svg" alt="Instagram" width={24} height={24} />
            </a>
          </div>
          <div className="contact-details">
            <h3 className="mb-2">Toll Free Number : +91-141-2227899</h3>
            <p>(9:30 AM TO 6 PM – IST; {t("MONDAY TO FRIDAY")})</p>
          </div>
        </div>

        <div className="f-bottom d-flex justify-content-between align-items-center flex-column flex-md-row mt-5 pt-4">
          <p>© Copyright 2025. All rights reserved by Guidance, Government of Uttarakhand.</p>
          <div className="d-flex">
            <p className="me-4">{t("Total Visitors")} : 1148303</p>
            <p>{t("Email")} : mpr@doiuk.org</p>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
