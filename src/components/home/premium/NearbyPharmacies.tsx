import { motion } from 'framer-motion';
import { MapPin, Clock, Phone, Navigation, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';

const nearbyPharmacies = [
  {
    name: 'CVS Pharmacy',
    address: '123 Main Street',
    distance: '0.3 mi',
    hours: 'Open 24/7',
    rating: 4.5,
    isOpen: true,
  },
  {
    name: 'Walgreens',
    address: '456 Oak Avenue',
    distance: '0.7 mi',
    hours: 'Until 10 PM',
    rating: 4.3,
    isOpen: true,
  },
  {
    name: 'Rite Aid',
    address: '789 Pine Road',
    distance: '1.2 mi',
    hours: 'Until 9 PM',
    rating: 4.1,
    isOpen: true,
  },
  {
    name: 'Costco Pharmacy',
    address: '321 Commerce Blvd',
    distance: '2.1 mi',
    hours: 'Until 7 PM',
    rating: 4.7,
    isOpen: false,
  },
];

export default function NearbyPharmacies() {
  return (
    <section className="py-24 bg-gradient-to-b from-emerald-500/5 to-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10"
        >
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm font-medium mb-4">
              <MapPin className="w-4 h-4" />
              Near You
            </div>
            <h2 className="text-4xl md:text-5xl font-extralight tracking-tight text-foreground mb-2">
              Pharmacies Open Now
            </h2>
            <p className="text-muted-foreground font-light">
              Find medications and health products nearby
            </p>
          </div>
          <Button variant="outline" className="rounded-full gap-2 self-start md:self-auto">
            <Navigation className="w-4 h-4" />
            View Map
          </Button>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {nearbyPharmacies.map((pharmacy, index) => (
            <motion.div
              key={pharmacy.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -5 }}
              className="group"
            >
              <div className="h-full p-5 rounded-2xl bg-card border border-border/50 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300">
                <div className="flex items-start justify-between mb-3">
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    pharmacy.isOpen 
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                      : 'bg-red-500/10 text-red-600 dark:text-red-400'
                  }`}>
                    {pharmacy.isOpen ? 'Open' : 'Closed'}
                  </div>
                  <div className="flex items-center gap-1 text-sm">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    <span className="text-foreground">{pharmacy.rating}</span>
                  </div>
                </div>

                <h3 className="font-semibold text-foreground mb-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  {pharmacy.name}
                </h3>
                <p className="text-sm text-muted-foreground mb-3">{pharmacy.address}</p>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Navigation className="w-3 h-3" />
                    {pharmacy.distance}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {pharmacy.hours}
                  </span>
                </div>

                <div className="mt-4 pt-4 border-t border-border/50 flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 rounded-full text-xs h-8">
                    <Phone className="w-3 h-3 mr-1" />
                    Call
                  </Button>
                  <Button size="sm" className="flex-1 rounded-full text-xs h-8 bg-emerald-500 hover:bg-emerald-600 text-white">
                    <Navigation className="w-3 h-3 mr-1" />
                    Directions
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
