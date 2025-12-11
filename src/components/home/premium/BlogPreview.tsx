import { motion } from 'framer-motion';
import { ArrowRight, Calendar, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

const blogPosts = [
  {
    title: 'The Future of Telemedicine in 2025',
    excerpt: 'How virtual consultations are reshaping healthcare delivery and what it means for patients.',
    category: 'Technology',
    author: 'Dr. Sarah Mitchell',
    date: 'Dec 10, 2025',
    readTime: '5 min',
    image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=400&h=250&fit=crop',
  },
  {
    title: 'Understanding Your Lab Results',
    excerpt: 'A comprehensive guide to reading and interpreting common blood test results.',
    category: 'Health Tips',
    author: 'Dr. James Chen',
    date: 'Dec 8, 2025',
    readTime: '8 min',
    image: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=400&h=250&fit=crop',
  },
  {
    title: 'Preventive Care: Your Best Investment',
    excerpt: 'Why regular health screenings can save your life and money in the long run.',
    category: 'Wellness',
    author: 'Dr. Emily Rodriguez',
    date: 'Dec 5, 2025',
    readTime: '6 min',
    image: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=400&h=250&fit=crop',
  },
];

export default function BlogPreview() {
  return (
    <section className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10"
        >
          <div>
            <h2 className="text-4xl md:text-5xl font-extralight tracking-tight text-foreground mb-2">
              Health Insights
            </h2>
            <p className="text-muted-foreground font-light">
              Expert articles and guides for better health
            </p>
          </div>
          <Button variant="ghost" className="gap-2 text-primary self-start md:self-auto">
            View All Articles <ArrowRight className="w-4 h-4" />
          </Button>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {blogPosts.map((post, index) => (
            <motion.article
              key={post.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -5 }}
              className="group cursor-pointer"
            >
              <div className="rounded-3xl overflow-hidden bg-card border border-border/50 hover:border-primary/30 hover:shadow-xl transition-all duration-300">
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={post.image}
                    alt={post.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 rounded-full bg-background/90 backdrop-blur-sm text-xs font-medium text-foreground">
                      {post.category}
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  <h3 className="font-semibold text-lg text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {post.excerpt}
                  </p>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {post.author}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {post.readTime}
                      </span>
                    </div>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {post.date}
                    </span>
                  </div>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
