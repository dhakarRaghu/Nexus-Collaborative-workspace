import React from 'react'
import Home from './helper'
import { redirect } from 'next/navigation'
import { getAuthSession } from '@/lib/auth'

const HomePage = async() => {
    const session = await getAuthSession()

    if (!session?.user) {
      return redirect("/login")
    }
  return (
    <div>
      <Home/>
    </div>
  )
}

export default HomePage
