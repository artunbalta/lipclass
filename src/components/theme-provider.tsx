"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { usePathname } from "next/navigation"

export function ThemeProvider({
    children,
    ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
    const pathname = usePathname()
    const isDashboard = pathname?.startsWith('/dashboard')

    return <NextThemesProvider {...props} forcedTheme={isDashboard ? undefined : 'light'}>{children}</NextThemesProvider>
}
