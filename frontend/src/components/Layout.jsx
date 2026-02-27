import React from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'

export default function Layout() {
  return (
    <>
      <Navbar variant="light" />
      <main style={{ paddingTop: 'var(--header-height)', minHeight: '100vh' }}>
        <Outlet />
      </main>
      <Footer />
    </>
  )
}
