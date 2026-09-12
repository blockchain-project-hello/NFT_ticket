export default function EventPage({ params }: { params: { id: string } }) {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Event Details: {params.id}</h1>
    </div>
  );
}
