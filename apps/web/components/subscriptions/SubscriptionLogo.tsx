"use client"

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

export function SubscriptionLogo({ name, logo }: { name: string; logo: string }) {
  return (
    <Avatar className="w-10 h-10 border border-slate-200">
      <AvatarImage
        src={logo}
        alt={`${name} logo`}
        className="object-cover"
      />
      <AvatarFallback className="bg-linear-to-br from-slate-100 to-slate-200 text-slate-600 font-semibold text-sm">
        {name.charAt(0).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  )
}
