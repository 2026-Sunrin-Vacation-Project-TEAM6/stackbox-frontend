/*
 * The auth surface is one sheet on the workspace background: a 2px ink frame
 * with the hard offset, so the thing you type into is an object rather than a
 * column of text floating in the middle of an empty page (§13, §30).
 *
 * It was previously a 384px unframed column at 13px — narrow enough that the
 * two mode tabs and the fields read as a mobile form scaled down. 448px with
 * real padding is the smallest width at which "Create account" and its fields
 * sit at the app's own type scale.
 */
export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center p-8">
      <div className="w-full max-w-md border-2 border-text bg-paper px-8 py-7 shadow-hard">
        {children}
      </div>
    </div>
  )
}
