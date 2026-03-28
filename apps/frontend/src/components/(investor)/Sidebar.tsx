"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Link, usePathname } from "@/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useTranslations } from "next-intl";
import { useSchemes } from "@/hooks/master/useSchemes";
import { useIncentiveApplicationSubmissions } from "@/hooks/master/useIncentiveApplicationSubmissions";

/* -------------------------
   Your existing Icons object
   (KEEP IT EXACTLY AS YOU POSTED)
------------------------- */
interface SchemeData {
  id: number;
  policy_id: number;
  scheme_name: string;
  scheme_code: string;
  cascading_config: any[];
  pop_message_config: {
    enabled: boolean;
    title?: string;
    sections?: any[];
    acknowledgement_text?: string;
  } | null;
  form_structure_json: any[];
  required_documents: any;
  workflow_config?: {
    submit_url?: string;
    draft_url?: string;
    is_multi_step?: boolean;
    stages?: any[];
  };
  version: number;
  is_current_version: boolean;
  valid_from: string;
  valid_to: string;
  policy?: {
    policy_code: string;
    policy_name: string;
  };
}
const Icons = {
  dashboard: (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M7.77778 11.1111H1.11111C0.816426 11.1111 0.533811 11.2282 0.325437 11.4365C0.117063 11.6449 0 11.9275 0 12.2222V18.8889C0 19.1836 0.117063 19.4662 0.325437 19.6746C0.533811 19.8829 0.816426 20 1.11111 20H7.77778C8.07246 20 8.35508 19.8829 8.56345 19.6746C8.77183 19.4662 8.88889 19.1836 8.88889 18.8889V12.2222C8.88889 11.9275 8.77183 11.6449 8.56345 11.4365C8.35508 11.2282 8.07246 11.1111 7.77778 11.1111ZM6.66667 17.7778H2.22222V13.3333H6.66667V17.7778ZM18.8889 0H12.2222C11.9275 0 11.6449 0.117063 11.4365 0.325437C11.2282 0.533811 11.1111 0.816426 11.1111 1.11111V7.77778C11.1111 8.07246 11.2282 8.35508 11.4365 8.56345C11.6449 8.77183 11.9275 8.88889 12.2222 8.88889H18.8889C19.1836 8.88889 19.4662 8.77183 19.6746 8.56345C19.8829 8.35508 20 8.07246 20 7.77778V1.11111C20 0.816426 19.8829 0.533811 19.6746 0.325437C19.4662 0.117063 19.1836 0 18.8889 0ZM17.7778 6.66667H13.3333V2.22222H17.7778V6.66667ZM18.8889 14.4444H16.6667V12.2222C16.6667 11.9275 16.5496 11.6449 16.3412 11.4365C16.1329 11.2282 15.8502 11.1111 15.5556 11.1111C15.2609 11.1111 14.9783 11.2282 14.7699 11.4365C14.5615 11.6449 14.4444 11.9275 14.4444 12.2222V14.4444H12.2222C11.9275 14.4444 11.6449 14.5615 11.4365 14.7699C11.2282 14.9783 11.1111 15.2609 11.1111 15.5556C11.1111 15.8502 11.2282 16.1329 11.4365 16.3412C11.6449 16.5496 11.9275 16.6667 12.2222 16.6667H14.4444V18.8889C14.4444 19.1836 14.5615 19.4662 14.7699 19.6746C14.9783 19.8829 15.2609 20 15.5556 20C15.8502 20 16.1329 19.8829 16.3412 19.6746C16.5496 19.4662 16.6667 19.1836 16.6667 18.8889V16.6667H18.8889C19.1836 16.6667 19.4662 16.5496 19.6746 16.3412C19.8829 16.1329 20 15.8502 20 15.5556C20 15.2609 19.8829 14.9783 19.6746 14.7699C19.4662 14.5615 19.1836 14.4444 18.8889 14.4444ZM7.77778 0H1.11111C0.816426 0 0.533811 0.117063 0.325437 0.325437C0.117063 0.533811 0 0.816426 0 1.11111V7.77778C0 8.07246 0.117063 8.35508 0.325437 8.56345C0.533811 8.77183 0.816426 8.88889 1.11111 8.88889H7.77778C8.07246 8.88889 8.35508 8.77183 8.56345 8.56345C8.77183 8.35508 8.88889 8.07246 8.88889 7.77778V1.11111C8.88889 0.816426 8.77183 0.533811 8.56345 0.325437C8.35508 0.117063 8.07246 0 7.77778 0ZM6.66667 6.66667H2.22222V2.22222H6.66667V6.66667Z" />
    </svg>
  ),
  add: (
    <svg
      className="sidebar-icon"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 20 25"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
      />
    </svg>
  ),
  list: (
    <svg
      width="20"
      height="25"
      viewBox="0 0 20 25"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M16.25 2.5H14.775C14.5171 1.77056 14.0399 1.13875 13.4088 0.691173C12.7778 0.243598 12.0237 0.00217439 11.25 0H8.75C7.97632 0.00217439 7.22225 0.243598 6.59117 0.691173C5.96009 1.13875 5.48289 1.77056 5.225 2.5H3.75C2.75544 2.5 1.80161 2.89509 1.09835 3.59835C0.395088 4.30161 0 5.25544 0 6.25V21.25C0 22.2446 0.395088 23.1984 1.09835 23.9017C1.80161 24.6049 2.75544 25 3.75 25H16.25C17.2446 25 18.1984 24.6049 18.9017 23.9017C19.6049 23.1984 20 22.2446 20 21.25V6.25C20 5.25544 19.6049 4.30161 18.9017 3.59835C18.1984 2.89509 17.2446 2.5 16.25 2.5ZM7.5 3.75C7.5 3.41848 7.6317 3.10054 7.86612 2.86612C8.10054 2.6317 8.41848 2.5 8.75 2.5H11.25C11.5815 2.5 11.8995 2.6317 12.1339 2.86612C12.3683 3.10054 12.5 3.41848 12.5 3.75V5H7.5V3.75ZM17.5 21.25C17.5 21.5815 17.3683 21.8995 17.1339 22.1339C16.8995 22.3683 16.5815 22.5 16.25 22.5H3.75C3.41848 22.5 3.10054 22.3683 2.86612 22.1339C2.6317 21.8995 2.5 21.5815 2.5 21.25V6.25C2.5 5.91848 2.6317 5.60054 2.86612 5.36612C3.10054 5.1317 3.41848 5 3.75 5H5V6.25C5 6.58152 5.1317 6.89946 5.36612 7.13388C5.60054 7.3683 5.91848 7.5 6.25 7.5H13.75C14.0815 7.5 14.3995 7.3683 14.6339 7.13388C14.8683 6.89946 15 6.58152 15 6.25V5H16.25C16.5815 5 16.8995 5.1317 17.1339 5.36612C17.3683 5.60054 17.5 5.91848 17.5 6.25V21.25Z" />
    </svg>
  ),
  search: (
    <svg
      className="sidebar-icon"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 20 25"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  ),
  folder: (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M11 14.0012H5.00001C4.73479 14.0012 4.48044 14.1065 4.2929 14.294C4.10536 14.4815 4.00001 14.7358 4.00001 15.001C4.00001 15.2662 4.10536 15.5205 4.2929 15.708C4.48044 15.8955 4.73479 16.0008 5.00001 16.0008H11C11.2652 16.0008 11.5196 15.8955 11.7071 15.708C11.8946 15.5205 12 15.2662 12 15.001C12 14.7358 11.8946 14.4815 11.7071 14.294C11.5196 14.1065 11.2652 14.0012 11 14.0012ZM7.00001 8.00238H9C9.26522 8.00238 9.51957 7.89705 9.70711 7.70955C9.89465 7.52205 10 7.26775 10 7.00258C10 6.73742 9.89465 6.48312 9.70711 6.29562C9.51957 6.10812 9.26522 6.00278 9 6.00278H7.00001C6.73479 6.00278 6.48044 6.10812 6.2929 6.29562C6.10536 6.48312 6.00001 6.73742 6.00001 7.00258C6.00001 7.26775 6.10536 7.52205 6.2929 7.70955C6.48044 7.89705 6.73479 8.00238 7.00001 8.00238ZM19 10.002H16V1.00378C16.0007 0.8276 15.9548 0.654368 15.867 0.501621C15.7792 0.348873 15.6526 0.222035 15.5 0.133948C15.348 0.0461972 15.1755 0 15 0C14.8245 0 14.652 0.0461972 14.5 0.133948L11.5 1.85361L8.5 0.133948C8.34799 0.0461972 8.17554 0 8 0C7.82447 0 7.65202 0.0461972 7.50001 0.133948L4.50001 1.85361L1.50001 0.133948C1.34799 0.0461972 1.17554 0 1.00001 0C0.824471 0 0.652027 0.0461972 0.500008 0.133948C0.347403 0.222035 0.220789 0.348873 0.132986 0.501621C0.0451828 0.654368 -0.000691684 0.8276 7.88288e-06 1.00378V17.0006C7.88288e-06 17.7961 0.316078 18.559 0.878687 19.1215C1.4413 19.684 2.20436 20 3.00001 20H17C17.7957 20 18.5587 19.684 19.1213 19.1215C19.6839 18.559 20 17.7961 20 17.0006V11.0018C20 10.7366 19.8946 10.4823 19.7071 10.2948C19.5196 10.1073 19.2652 10.002 19 10.002ZM3.00001 18.0004C2.73479 18.0004 2.48044 17.8951 2.2929 17.7076C2.10536 17.5201 2.00001 17.2658 2.00001 17.0006V2.73343L4.00001 3.8732C4.15434 3.9538 4.32588 3.99589 4.50001 3.99589C4.67413 3.99589 4.84567 3.9538 5.00001 3.8732L8 2.15355L11 3.8732C11.1543 3.9538 11.3259 3.99589 11.5 3.99589C11.6741 3.99589 11.8457 3.9538 12 3.8732L14 2.73343V17.0006C14.0027 17.3417 14.0636 17.6798 14.18 18.0004H3.00001ZM18 17.0006C18 17.2658 17.8946 17.5201 17.7071 17.7076C17.5196 17.8951 17.2652 18.0004 17 18.0004C16.7348 18.0004 16.4804 17.8951 16.2929 17.7076C16.1054 17.5201 16 17.2658 16 17.0006V12.0016H18V17.0006ZM11 10.002H5.00001C4.73479 10.002 4.48044 10.1073 4.2929 10.2948C4.10536 10.4823 4.00001 10.7366 4.00001 11.0018C4.00001 11.267 4.10536 11.5213 4.2929 11.7088C4.48044 11.8963 4.73479 12.0016 5.00001 12.0016H11C11.2652 12.0016 11.5196 11.8963 11.7071 11.7088C11.8946 11.5213 12 11.267 12 11.0018C12 10.7366 11.8946 10.4823 11.7071 10.2948C11.5196 10.1073 11.2652 10.002 11 10.002Z" />
    </svg>
  ),
  payment: (
    <svg
      className="sidebar-icon"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 20 25"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
      />
    </svg>
  ),
  bell: (
    <svg
      className="sidebar-icon"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 20 25"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5"
      />
    </svg>
  ),
  settings: (
    <svg
      width="34"
      height="38"
      viewBox="0 0 34 38"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M31.875 30H30V28.125C30 27.6277 29.8025 27.1508 29.4508 26.7992C29.0992 26.4475 28.6223 26.25 28.125 26.25C27.6277 26.25 27.1508 26.4475 26.7992 26.7992C26.4475 27.1508 26.25 27.6277 26.25 28.125V30H24.375C23.8777 30 23.4008 30.1975 23.0492 30.5492C22.6975 30.9008 22.5 31.3777 22.5 31.875C22.5 32.3723 22.6975 32.8492 23.0492 33.2008C23.4008 33.5525 23.8777 33.75 24.375 33.75H26.25V35.625C26.25 36.1223 26.4475 36.5992 26.7992 36.9508C27.1508 37.3025 27.6277 37.5 28.125 37.5C28.6223 37.5 29.0992 37.3025 29.4508 36.9508C29.8025 36.5992 30 36.1223 30 35.625V33.75H31.875C32.3723 33.75 32.8492 33.5525 33.2008 33.2008C33.5525 32.8492 33.75 32.3723 33.75 31.875C33.75 31.3777 33.5525 30.9008 33.2008 30.5492C32.8492 30.1975 32.3723 30 31.875 30ZM18.75 33.75H5.625C5.12772 33.75 4.65081 33.5525 4.29918 33.2008C3.94754 32.8492 3.75 32.3723 3.75 31.875V5.625C3.75 5.12772 3.94754 4.65081 4.29918 4.29918C4.65081 3.94754 5.12772 3.75 5.625 3.75H15V9.375C15 10.8668 15.5926 12.2976 16.6475 13.3525C17.7024 14.4074 19.1332 15 20.625 15H26.25V20.625C26.25 21.1223 26.4475 21.5992 26.7992 21.9508C27.1508 22.3025 27.6277 22.5 28.125 22.5C28.6223 22.5 29.0992 22.3025 29.4508 21.9508C29.8025 21.5992 30 21.1223 30 20.625V13.125C30 13.125 30 13.125 30 13.0125C29.9805 12.8403 29.9428 12.6706 29.8875 12.5063V12.3375C29.7973 12.1447 29.6771 11.9675 29.5312 11.8125L18.2812 0.5625C18.1263 0.416655 17.949 0.296402 17.7563 0.20625C17.6942 0.195393 17.6308 0.195393 17.5687 0.20625C17.3864 0.108756 17.1905 0.0392287 16.9875 0H5.625C4.13316 0 2.70242 0.592632 1.64752 1.64752C0.592632 2.70242 0 4.13316 0 5.625V31.875C0 33.3668 0.592632 34.7976 1.64752 35.8525C2.70242 36.9074 4.13316 37.5 5.625 37.5H18.75C19.2473 37.5 19.7242 37.3025 20.0758 36.9508C20.4275 36.5992 20.625 36.1223 20.625 35.625C20.625 35.1277 20.4275 34.6508 20.0758 34.2992C19.7242 33.9475 19.2473 33.75 18.75 33.75ZM18.75 6.39375L23.6063 11.25H20.625C20.1277 11.25 19.6508 11.0525 19.2992 10.7008C18.9475 10.3492 18.75 9.87228 18.75 9.375V6.39375ZM9.375 11.25C8.87772 11.25 8.40081 11.4475 8.04918 11.7992C7.69754 12.1508 7.5 12.6277 7.5 13.125C7.5 13.6223 7.69754 14.0992 8.04918 14.4508C8.40081 14.8025 8.87772 15 9.375 15H11.25C11.7473 15 12.2242 14.8025 12.5758 14.4508C12.9275 14.0992 13.125 13.6223 13.125 13.125C13.125 12.6277 12.9275 12.1508 12.5758 11.7992C12.2242 11.4475 11.7473 11.25 11.25 11.25H9.375ZM18.75 26.25H9.375C8.87772 26.25 8.40081 26.4475 8.04918 26.7992C7.69754 27.1508 7.5 27.6277 7.5 28.125C7.5 28.6223 7.69754 29.0992 8.04918 29.4508C8.40081 29.8025 8.87772 30 9.375 30H18.75C19.2473 30 19.7242 29.8025 20.0758 29.4508C20.4275 29.0992 20.625 28.6223 20.625 28.125C20.625 27.6277 20.4275 27.1508 20.0758 26.7992C19.7242 26.4475 19.2473 26.25 18.75 26.25ZM20.625 18.75H9.375C8.87772 18.75 8.40081 18.9475 8.04918 19.2992C7.69754 19.6508 7.5 20.1277 7.5 20.625C7.5 21.1223 7.69754 21.5992 8.04918 21.9508C8.40081 22.3025 8.87772 22.5 9.375 22.5H20.625C21.1223 22.5 21.5992 22.3025 21.9508 21.9508C22.3025 21.5992 22.5 21.1223 22.5 20.625C22.5 20.1277 22.3025 19.6508 21.9508 19.2992C21.5992 18.9475 21.1223 18.75 20.625 18.75Z" />
    </svg>
  ),
  logout: (
    <svg
      width="20"
      height="22"
      viewBox="0 0 20 22"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M19.9166 14.982C19.8603 14.8487 19.7814 14.7259 19.6832 14.619L16.349 11.319C16.1397 11.1119 15.8558 10.9955 15.5599 10.9955C15.2639 10.9955 14.98 11.1119 14.7708 11.319C14.5615 11.5261 14.4439 11.8071 14.4439 12.1C14.4439 12.3929 14.5615 12.6739 14.7708 12.881L16.2156 14.3H10.0028C9.708 14.3 9.42531 14.4159 9.21688 14.6222C9.00845 14.8285 8.89135 15.1083 8.89135 15.4C8.89135 15.6917 9.00845 15.9715 9.21688 16.1778C9.42531 16.3841 9.708 16.5 10.0028 16.5H16.2156L14.7708 17.919C14.6666 18.0213 14.5839 18.1429 14.5275 18.277C14.4711 18.411 14.442 18.5548 14.442 18.7C14.442 18.8452 14.4711 18.989 14.5275 19.123C14.5839 19.2571 14.6666 19.3787 14.7708 19.481C14.8741 19.5841 14.997 19.6659 15.1324 19.7218C15.2679 19.7776 15.4131 19.8064 15.5599 19.8064C15.7066 19.8064 15.8519 19.7776 15.9873 19.7218C16.1227 19.6659 16.2457 19.5841 16.349 19.481L19.6832 16.181C19.7861 16.0777 19.8657 15.954 19.9166 15.818C20.0278 15.5502 20.0278 15.2498 19.9166 14.982ZM12.2256 19.8H3.33426C3.03949 19.8 2.7568 19.6841 2.54837 19.4778C2.33993 19.2715 2.22284 18.9917 2.22284 18.7V3.3C2.22284 3.00826 2.33993 2.72847 2.54837 2.52218C2.7568 2.31589 3.03949 2.2 3.33426 2.2H8.89135V5.5C8.89135 6.37521 9.24264 7.21458 9.86793 7.83345C10.4932 8.45232 11.3413 8.8 12.2256 8.8H16.6713C16.8907 8.79892 17.1049 8.73357 17.2869 8.61221C17.4688 8.49084 17.6104 8.31888 17.6938 8.118C17.7789 7.91768 17.8022 7.69689 17.7606 7.48351C17.7191 7.27012 17.6146 7.07369 17.4604 6.919L10.7919 0.319C10.7 0.233438 10.595 0.162889 10.4807 0.11H10.3807L10.0695 0H3.33426C2.44996 0 1.60188 0.347678 0.976581 0.966548C0.351287 1.58542 0 2.42479 0 3.3V18.7C0 19.5752 0.351287 20.4146 0.976581 21.0335C1.60188 21.6523 2.44996 22 3.33426 22H12.2256C12.5204 22 12.8031 21.8841 13.0115 21.6778C13.2199 21.4715 13.337 21.1917 13.337 20.9C13.337 20.6083 13.2199 20.3285 13.0115 20.1222C12.8031 19.9159 12.5204 19.8 12.2256 19.8ZM11.1142 3.751L13.9928 6.6H12.2256C11.9308 6.6 11.6481 6.48411 11.4397 6.27782C11.2313 6.07153 11.1142 5.79174 11.1142 5.5V3.751Z"></path>
    </svg>
  ),
  chevronLeft: (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 19l-7-7 7-7"
      />
    </svg>
  ),
  chevronRight: (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5l7 7-7 7"
      />
    </svg>
  ),
  chevronDown: (
    <svg
      width="15"
      height="9"
      viewBox="0 0 15 9"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M14.5791 0.41897C14.3125 0.150622 13.9518 0 13.5759 0C13.2 0 12.8394 0.150622 12.5728 0.41897L7.46443 5.51935L2.42724 0.41897C2.16063 0.150622 1.79999 0 1.42407 0C1.04815 0 0.687506 0.150622 0.420902 0.41897C0.287532 0.552909 0.181674 0.712262 0.109433 0.887835C0.0371927 1.06341 0 1.25173 0 1.44193C0 1.63213 0.0371927 1.82045 0.109433 1.99602C0.181674 2.17159 0.287532 2.33095 0.420902 2.46489L6.45414 8.57382C6.58642 8.70886 6.7438 8.81605 6.9172 8.88919C7.0906 8.96234 7.27658 9 7.46443 9C7.65227 9 7.83826 8.96234 8.01165 8.88919C8.18505 8.81605 8.34243 8.70886 8.47471 8.57382L14.5791 2.46489C14.7125 2.33095 14.8183 2.17159 14.8906 1.99602C14.9628 1.82045 15 1.63213 15 1.44193C15 1.25173 14.9628 1.06341 14.8906 0.887835C14.8183 0.712262 14.7125 0.552909 14.5791 0.41897Z"
        fill="#A1A1A1"
      />
    </svg>
  ),
  dot: (
    <svg
      className="w-3 h-3"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5l7 7-7 7"
      />
    </svg>
  ),
};

/* -------------------------
   Types
   ------------------------- */
type Child = {
  name: string;
  href?: string;
  icon?: React.ReactNode;
  children?: Child[];
};
type MenuItem = {
  name: string;
  icon?: React.ReactNode;
  href?: string;
  children?: Child[];
};

export default function Sidebar() {
  const { logout } = useAuth();
  const pathname = usePathname();
  const t = useTranslations("InvestorDashboard");
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const { data, isLoading } = useSchemes();

  const { user } = useAuth();
  const { data: applications } = useIncentiveApplicationSubmissions({
    applicationStatus: "APPROVED",
    userId: user?.id ? Number(user.id) : undefined,
  });

  const withLocale = (href: string) => {
    return href;
  };
  const matchPostData = (postData: any, condition: any): boolean => {
    if (!postData) return false;

    const fieldValue = postData?.[condition.field_code];
    const conditionValue = condition?.value;

    switch (condition.operator) {
      case "equals":
        return fieldValue == conditionValue;

      case "not_equals":
        return fieldValue != conditionValue;

      case "in":
        return Array.isArray(conditionValue)
          ? conditionValue.includes(fieldValue)
          : false;

      case "not_in":
        return Array.isArray(conditionValue)
          ? !conditionValue.includes(fieldValue)
          : false;

      case "greater_than":
        return Number(fieldValue) > Number(conditionValue);

      case "less_than":
        return Number(fieldValue) < Number(conditionValue);

      case "contains":
        return typeof fieldValue === "string" &&
          typeof conditionValue === "string"
          ? fieldValue.includes(conditionValue)
          : false;

      case "is_empty":
        return (
          fieldValue === undefined ||
          fieldValue === null ||
          fieldValue === "" ||
          (typeof fieldValue === "string" && fieldValue.trim() === "")
        );

      case "is_not_empty":
        return !(
          fieldValue === undefined ||
          fieldValue === null ||
          fieldValue === "" ||
          (typeof fieldValue === "string" && fieldValue.trim() === "")
        );

      default:
        return true; // fallback safe behavior
    }
  };

  const checkCondition = (config: any) => {
    if (!config?.groups || !applications?.length) {
      return false;
    }

    const groupResults = config.groups.map((group: any) => {
      if (!group.conditions?.length) {
        return false;
      }

      const conditionResults = group.conditions.map((condition: any) => {
        const schemeCode = Number(condition.scheme_code);

        const application = applications.find(
          (app: any) =>
            Number(app.incentiveId) === schemeCode &&
            app.applicationStatus === "APPROVED",
        );

        if (!application) {
          return false;
        }

        return matchPostData(application.postData, condition);
      });

      if (group.logicalOperator === "OR") {
        return conditionResults.some(Boolean);
      }
      return conditionResults.every(Boolean);
    });

    let finalResult = groupResults[0] ?? false;

    for (let i = 1; i < groupResults.length; i++) {
      const joinOperator = config.groups[i].joinOperator;

      if (joinOperator === "OR") {
        finalResult = finalResult || groupResults[i];
      } else {
        finalResult = finalResult && groupResults[i];
      }
    }

    return finalResult;
  };

  const incentiveChildrenFinal: Child[] = useMemo(() => {
    if (isLoading) return [{ name: "Loading schemes...", href: "#", icon: Icons.dot }];

    const schemesData = (data ?? []) as SchemeData[];

    const grouped = schemesData.reduce(
      (acc: Record<string, SchemeData[]>, scheme) => {
        const policyName = scheme.policy?.policy_name || "Other Policies";

        if (!acc[policyName]) acc[policyName] = [];
        acc[policyName].push(scheme);

        return acc;
      },
      {},
    );

    return Object.entries(grouped)
      .map(([policyName, schemes]) => ({
        name: policyName,
        icon: Icons.dot,
        children: schemes
          .filter((scheme) => {
            if (!scheme.cascading_config) return true;

            if (Array.isArray(scheme.cascading_config)) {
              if (scheme.cascading_config.length === 0) return true;
              return checkCondition(scheme.cascading_config);
            }

            try {
              const parsed =
                typeof scheme.cascading_config === "string"
                  ? JSON.parse(scheme.cascading_config)
                  : scheme.cascading_config;

              const isEmpty =
                !parsed ||
                Object.keys(parsed).length === 0 ||
                !parsed.groups ||
                parsed.groups.length === 0;

              if (isEmpty) return true;
              return checkCondition(parsed);
            } catch {
              return false;
            }
          })
          .map((scheme) => ({
            name: scheme.scheme_name,
            href: `/investor/apply/${scheme.policy?.policy_code}/${scheme.scheme_code}/${scheme.version}`,
            icon: Icons.dot,
          })),
      }))
      .filter((policy) => policy.children.length > 0);
  }, [isLoading, data, applications]);

  /* Menu definition */
  const menuItems: MenuItem[] = [
    { name: "Dashboard", icon: Icons.dashboard, href: "/investor/dashboard" },
    { name: "Applied Applications", icon: Icons.list, href: "/investor/applications" },
    { name: "Inspections", icon: Icons.list, href: "/investor/inspections" },
    { name: "Investor DMS", icon: Icons.folder, href: "/investor/documents" },
    {
      name: t("Wizards"),
      icon: Icons.list,
      href: "/investor/applications",
      children: [
        {
          name: t("Know Your Approval"),
          href: "/investor/applications",
          icon: Icons.dot,
        },
        {
          name: t("Know Your Incentives"),
          href: "/investor/applications?filter=draft",
          icon: Icons.dot,
        },
        {
          name: t("Incentive Calculators"),
          href: "/investor/applications?filter=submitted",
          icon: Icons.dot,
        },
      ],
    },
    {
      name: t("Apply for Departmental Services"),
      icon: Icons.settings,
      href: "/investor/settings",
      children: [
        {
          name: t("Apply for Pre-Establishment Services"),
          href: "/investor/services/list/pre-establishment",
          icon: Icons.dot,
        },
        {
          name: t("Apply for Pre-Operation Services"),
          href: "/investor/services/list/pre-operation",
          icon: Icons.dot,
        },
        {
          name: t("Apply for Post-Operation Services"),
          href: "/investor/services/list/post-operation",
          icon: Icons.dot,
        },
        {
          name: t("Apply for Unified Application"),
          href: "/investor/departmentservice",
          icon: Icons.dot,
        },
      ],
    },
    {
      name: t("Incentive Dashboard"),
      icon: Icons.dashboard,
      href: "/investor/incentive",
    },
    {
      name: t("Apply for Incentives"),
      icon: Icons.list,
      href: "/investor/apply",
      children: incentiveChildrenFinal,
    },
    {
      name: "New Application",
      icon: Icons.add,
      href: "/investor/applications/new",
    },
    {
      name: "Project Status Update",
      icon: Icons.add,
      href: "/investor/projectstatus",
    },
  ];

  const isValidMenuHref = (href?: string) => {
    return Boolean(href && href.startsWith("/"));
  };

  const getOpenFromPath = (path: string) => {
    for (const item of menuItems) {
      if (item.children) {
        if (isValidMenuHref(item.href) && path === item.href) return item.name;
        if (
          item.children.some(
            (c) => c.href && isValidMenuHref(c.href) && path.startsWith(c.href),
          )
        ) {
          return item.name;
        }
      }
    }
    return null;
  };

  const [openSubmenu, setOpenSubmenu] = useState<string | null>(() =>
    getOpenFromPath(pathname),
  );

  /* -------------------------
     COLLAPSE STATE (NEW)
  ------------------------- */
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    if (isSidebarOpen) {
      setOpenSubmenu(getOpenFromPath(pathname));
    } else {
      setOpenSubmenu(null);
    }
  }, [pathname, isSidebarOpen]);

  const toggleSubmenu = (name: string) => {
    if (!isSidebarOpen) return;
    setOpenSubmenu((prev) => (prev === name ? null : name));
  };

  const isParentActive = (item: MenuItem) => {
    if (item.href && isValidMenuHref(item.href) && pathname === item.href)
      return true;

    if (item.children) {
      return item.children.some(
        (c) =>
          c.href &&
          isValidMenuHref(c.href) &&
          (pathname === c.href || pathname.startsWith(c.href)),
      );
    }

    return false;
  };

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <aside
      className={`tailwind-scope investor-sidebar investor-bg fixed top-0 left-0 z-40
        h-[calc(100vh-2rem)]
        ${isSidebarOpen ? "w-64" : "w-20"}
        rounded-[20px] overflow-hidden hidden lg:flex flex-col m-3
        transition-all duration-300 ease-in-out`}
      aria-label="Sidebar"
    >
      {/* Logo + collapse button */}
      <div className="px-4 py-3 text-lg font-semibold flex items-center gap-2">
        <img
          src="https://investuttarakhand.uk.gov.in/themes/new_investuk/img/logo-invest-uttarakhand.png"
          alt="Invest Uttarakhand"
          className={`logo-investuk transition-opacity ${isSidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
        />

        <button
          type="button"
          aria-label="Toggle sidebar"
          onClick={() => {
            setIsSidebarOpen((v) => !v);
            setOpenSubmenu(null);
          }}
          className={`sidebar-toggle ml-auto flex items-center justify-center w-8 h-8 rounded-md hover:bg-gray-100 ${isSidebarOpen ? "" : "mx-auto"
            }`}
        >
          {isSidebarOpen ? Icons.chevronLeft : Icons.chevronRight}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2.5 py-4 space-y-6 overflow-y-auto">
        {isSidebarOpen && (
          <p className="menu-title px-3 mb-3 text-xs font-semibold tracking-wider uppercase">
            Menu
          </p>
        )}

        {menuItems.map((item) => {
          const hasChildren = Boolean(
            item.children && item.children.length > 0,
          );
          const parentActive = isParentActive(item);
          const isOpen = openSubmenu === item.name;

          if (!hasChildren) {
            return (
              <Link
                key={item.name}
                href={withLocale(item.href || "#")}
                prefetch
                className={`menu-link group flex items-center gap-3 py-2 rounded-md no-underline px-3 ${pathname === item.href ? "active" : ""}`}
              >
                {/* ICON MUST ALWAYS BE VISIBLE */}
                <span className="relative shrink-0">{item.icon}</span>
                {isSidebarOpen && <span>{item.name}</span>}
              </Link>
            );
          }

          return (
            <details
              key={item.name}
              className={`group menu-dropdown ${parentActive ? "active" : ""}`}
              open={isSidebarOpen && isOpen}
            >
              <summary
                className="menu-link flex items-start justify-between py-2 rounded-md cursor-pointer list-none px-3"
                onClick={(e) => {
                  e.preventDefault();
                  if (!isSidebarOpen) return;
                  toggleSubmenu(item.name);
                }}
              >
                <span className="flex items-start gap-3">
                  <span className="relative shrink-0">{item.icon}</span>

                  {isSidebarOpen && (
                    <span className="m-txt grow">{item.name}</span>
                  )}

                  {isSidebarOpen && (
                    <span
                      className={`transition mt-3 ${isOpen ? "rotate-180" : ""}`}
                    >
                      {Icons.chevronDown}
                    </span>
                  )}
                </span>
              </summary>
              {isSidebarOpen && (
                <div className="ml-4 mt-1 space-y-1">
                  {item.children!.map((child) => {
                    const hasGrandChildren =
                      child.children && child.children.length > 0;

                    // 🔹 If policy has schemes → render dropdown
                    if (hasGrandChildren) {
                      const isOpen = openDropdown === child.name;

                      return (
                        <details
                          key={child.name}
                          className="ml-2 group"
                          open={isOpen}
                        >
                          <summary
                            onClick={(e) => {
                              e.preventDefault(); // prevent default toggle
                              setOpenDropdown(isOpen ? null : child.name);
                            }}
                            className="d-flex items-center justify-between px-3 py-2 text-sm cursor-pointer list-none [&::-webkit-details-marker]:hidden"
                          >
                            <span>{child.name}</span>
                            <span
                              className={`transition ${isOpen ? "rotate-180" : ""
                                }`}
                            >
                              {Icons.chevronDown}
                            </span>
                          </summary>

                          <div className="ml-4 space-y-1">
                            {child.children!.map((scheme) => {
                              const active = pathname === scheme.href;
                              return (
                                <Link
                                  key={scheme.href}
                                  href={withLocale(scheme.href!)}
                                  prefetch
                                  className={`sidebar-submenu-link flex items-center gap-2 px-3 py-2 text-sm rounded-md ${active ? "active" : ""
                                    }`}
                                >
                                  <span className="w-2 h-2 bg-slate-400 rounded-full"></span>
                                  <span>{scheme.name}</span>
                                </Link>
                              );
                            })}
                          </div>
                        </details>
                      );
                    }

                    // 🔹 Normal child
                    return (
                      <Link
                        key={child.href}
                        href={withLocale(child.href!)}
                        prefetch
                        className="sidebar-submenu-link flex items-center gap-2 px-3 py-2 text-sm rounded-md"
                      >
                        <span className="w-2 h-2 bg-slate-400 rounded-full"></span>
                        <span>{child.name}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </details>
          );
        })}

        {isSidebarOpen && (
          <p className="menu-title px-3 mb-3 pt-6 text-xs font-semibold tracking-wider uppercase">
            General
          </p>
        )}

        <a
          href="#"
          onClick={handleLogout}
          className="menu-link group flex items-center gap-3 py-2 rounded-md no-underline px-3"
        >
          <span className="relative shrink-0">{Icons.logout}</span>
          {isSidebarOpen && <span>{t("Sign Out")}</span>}
        </a>
      </nav>
    </aside>
  );
}

