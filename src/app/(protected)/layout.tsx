"use client"

import React, { useState, useEffect } from 'react'
import { signIn, signOut, useSession } from 'next-auth/react'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from './app-sidebar'
import { ModeToggle } from './mode-toggle'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bell, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

type Props = {
  children: React.ReactNode
}

const SidebarLayout = ({ children }: Props) => {
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status !== 'loading') {
      setLoading(false)
    }
  }, [status])

  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1">
          <header className="h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-full items-center gap-4 px-10">
              <div className="flex-1 flex items-center gap-4">
                
              </div>

              <div className="flex items-center gap-4">
                <ModeToggle />
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative">
                      <Bell className="h-5 w-5" />
                      <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center">
                        3
                      </Badge>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-80">
                    <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="flex items-center gap-2 py-3">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                      <div>
                        <p className="text-sm font-medium">New commit in main branch</p>
                        <p className="text-xs text-muted-foreground">2 minutes ago</p>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="flex items-center gap-2 py-3">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                      <div>
                        <p className="text-sm font-medium">PR review requested</p>
                        <p className="text-xs text-muted-foreground">1 hour ago</p>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="flex items-center gap-2 py-3">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                      <div>
                        <p className="text-sm font-medium">Build completed successfully</p>
                        <p className="text-xs text-muted-foreground">2 hours ago</p>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {loading ? (
                  <Avatar>
                    <AvatarFallback>...</AvatarFallback>
                  </Avatar>
                ) : session?.user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Avatar className="cursor-pointer hover:opacity-80 transition-opacity">
                        <AvatarImage src={session.user.image || undefined} alt={session.user.name || "User avatar"} />
                        <AvatarFallback>{session.user.name?.[0]}</AvatarFallback>
                      </Avatar>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium leading-none">{session.user.name}</p>
                          <p className="text-xs leading-none text-muted-foreground">{session.user.email}</p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <span className="font-medium">Profile</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <span className="font-medium">Settings</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <span className="font-medium">Billing</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => signOut()}
                        className="text-destructive focus:text-destructive"
                      >
                        Sign out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Button 
                    onClick={() => signIn()}
                    className="bg-primary hover:bg-primary/90"
                  >
                    Sign In
                  </Button>
                )}
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-4">
            <div className="h-full rounded-lg border bg-card shadow-sm">
              {children}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}

export default SidebarLayout
