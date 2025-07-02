"use client"

import { useState, useEffect, useCallback, useRef } from "react"

export function useMobileDetection() {
  const [isMobile, setIsMobile] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const checkDevice = useCallback(() => {
    if (typeof window === "undefined") return

    const userAgent = navigator.userAgent.toLowerCase()
    const mobileKeywords = ["mobile", "android", "iphone", "ipod", "blackberry", "windows phone"]
    const isMobileDevice = mobileKeywords.some((keyword) => userAgent.includes(keyword))
    const isSmallScreen = window.innerWidth <= 768

    const newIsMobile = isMobileDevice || isSmallScreen
    setIsMobile((prev) => {
      if (prev !== newIsMobile) {
        if (process.env.NODE_ENV === "development") {
          console.log(`🔍 DEBUG: Actualizando isMobile a ${newIsMobile}`)
        }
        return newIsMobile
      }
      return prev
    })
  }, [])

  useEffect(() => {
    checkDevice()
    const handleResize = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = setTimeout(checkDevice, 200)
    }
    window.addEventListener("resize", handleResize)
    return () => {
      window.removeEventListener("resize", handleResize)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [checkDevice])

  return isMobile
}
