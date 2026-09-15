import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Ticket, Zap, Users, Bot, ArrowRight, Activity, Globe } from 'lucide-react';
import { getEvents } from '@/lib/api';
import Image from 'next/image';

export default async function Home() {
  const events = await getEvents();

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-24 pb-32 px-6">
        {/* Background Effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-violet-600/20 rounded-full blur-[120px] -z-10 animate-pulse-glow" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-cyan-600/20 rounded-full blur-[100px] -z-10" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] -z-10" />

        <div className="max-w-5xl mx-auto text-center space-y-8 animate-fadeIn">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card text-sm font-medium text-cyan-400 mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            Live on Polygon Amoy Testnet
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight">
            The Future of <br className="hidden md:block" />
            <span className="text-gradient">Event Ticketing</span>
          </h1>
          
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Mint programmable NFT tickets, utilize AI-driven dynamic pricing, and crowdfund your next big event without intermediaries.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link href="#events">
              <Button size="lg" className="w-full sm:w-auto gap-2">
                Explore Events <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                Organizer Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { label: "Tickets Minted", value: "45.2K", icon: Ticket },
            { label: "Total Volume", value: "$2.1M", icon: Activity },
            { label: "Active Events", value: "128", icon: Globe },
            { label: "Happy Fans", value: "32K+", icon: Users },
          ].map((stat, i) => (
            <div key={i} className="flex flex-col items-center justify-center text-center space-y-2 animate-slideUp" style={{ animationDelay: `${i * 100}ms` }}>
              <stat.icon className="w-6 h-6 text-violet-400 mb-2" />
              <div className="text-4xl font-bold text-white">{stat.value}</div>
              <div className="text-sm text-gray-500 uppercase tracking-widest">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-6 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Powered by Next-Gen Tech</h2>
            <p className="text-gray-400">Everything you need to manage modern events.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={Ticket}
              title="True Ownership"
              description="Tickets are NFTs on the blockchain. Verifiable, impossible to counterfeit, and fully owned by the fans."
            />
            <FeatureCard 
              icon={Zap}
              title="Dynamic Pricing"
              description="EIP-712 powered off-chain signatures allow real-time price adjustments without gas overhead."
            />
            <FeatureCard 
              icon={Bot}
              title="AI Assistant"
              description="Built-in RAG AI analyzes your sales data, answers queries, and helps optimize your event strategy."
            />
          </div>
        </div>
      </section>

      {/* Featured Events */}
      <section id="events" className="py-24 px-6 bg-black/40 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-12">
            <div>
              <h2 className="text-3xl font-bold mb-2">Upcoming Events</h2>
              <p className="text-gray-400">Don't miss out on the hottest gatherings.</p>
            </div>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {events.map((event) => (
              <Link href={`/events/${event.id}`} key={event.id} className="block group">
                <div className="glass-card rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_10px_40px_-10px_rgba(139,92,246,0.3)] border border-white/10 hover:border-violet-500/50">
                  <div className="h-48 relative overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={event.image} alt={event.name} className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-950 to-transparent" />
                    <div className="absolute bottom-4 left-4">
                      <div className="text-xs font-bold px-2 py-1 bg-violet-600 rounded text-white mb-2 inline-block">
                        {new Date(event.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                      <h3 className="text-xl font-bold text-white">{event.name}</h3>
                    </div>
                  </div>
                  <div className="p-5 flex items-center justify-between">
                    <div>
                      <div className="text-sm text-gray-400">Starting at</div>
                      <div className="text-lg font-bold text-cyan-400">{event.basePrice} ETH</div>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-violet-500 transition-colors">
                      <ArrowRight className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description }: { icon: any, title: string, description: string }) {
  return (
    <div className="glass-card p-8 rounded-3xl hover:bg-white/[0.08] transition-colors group">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
        <Icon className="w-7 h-7 text-cyan-400" />
      </div>
      <h3 className="text-xl font-bold mb-3 text-white">{title}</h3>
      <p className="text-gray-400 leading-relaxed">{description}</p>
    </div>
  );
}
