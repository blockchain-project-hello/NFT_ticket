import React from 'react';

interface TicketCardProps {
  title: string;
  price: string;
}

export function TicketCard({ title, price }: TicketCardProps) {
  return (
    <div className="border rounded p-4 shadow-sm">
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="text-gray-600">{price} MATIC</p>
    </div>
  );
}
