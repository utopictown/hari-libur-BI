import { NextPage } from 'next'
import Router from 'next/router'
import { useEffect } from 'react'

const Page: NextPage = () => {
  useEffect(() => {
    Router.push('/api/v1')
  })
  return <span>loading..</span>
}

export default Page