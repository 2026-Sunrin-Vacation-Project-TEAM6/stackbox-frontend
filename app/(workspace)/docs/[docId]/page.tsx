export default async function DocPage({
  params,
}: {
  params: Promise<{ docId: string }>
}) {
  const { docId } = await params
  return (
    <div className="flex flex-col flex-1 items-center justify-center">
      <h1>Doc {docId}</h1>
    </div>
  )
}
