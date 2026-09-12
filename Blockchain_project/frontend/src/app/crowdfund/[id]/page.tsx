export default function CrowdfundPage({ params }: { params: { id: string } }) {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Crowdfund Campaign: {params.id}</h1>
    </div>
  );
}
