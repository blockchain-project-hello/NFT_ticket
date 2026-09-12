export const fetchPriceQuote = async (eventId: string, buyer: string) => {
  const res = await fetch(`/api/v1/pricing/quote?event_id=${eventId}&buyer=${buyer}`);
  return res.json();
};
