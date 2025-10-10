import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Filter, ThumbsUp, MessageSquare } from "lucide-react";
import { useState } from "react";
import { Progress } from "@/components/ui/progress";

interface Review {
  patient_name: string;
  rating: number;
  comment: string;
  date: string;
}

interface PerformanceReviewsProps {
  reviews: Review[];
  averageRating: number;
  totalReviews: number;
}

export function PerformanceReviews({ reviews, averageRating, totalReviews }: PerformanceReviewsProps) {
  const [filter, setFilter] = useState<number | 'all'>('all');

  // Calculate rating distribution
  const ratingDistribution = [5, 4, 3, 2, 1].map(stars => ({
    stars,
    count: reviews.filter(r => r.rating === stars).length,
    percentage: totalReviews > 0 ? (reviews.filter(r => r.rating === stars).length / totalReviews) * 100 : 0
  }));

  const filteredReviews = filter === 'all' 
    ? reviews 
    : reviews.filter(r => r.rating === filter);

  return (
    <div className="space-y-6">
      {/* Rating Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Overall Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-6xl font-bold text-primary">{averageRating.toFixed(1)}</div>
                <div className="flex items-center justify-center gap-1 mt-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-5 h-5 ${i < Math.round(averageRating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                    />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mt-2">Based on {totalReviews} reviews</p>
              </div>
              
              <div className="flex-1 space-y-2">
                {ratingDistribution.map(({ stars, count, percentage }) => (
                  <div key={stars} className="flex items-center gap-2">
                    <span className="text-sm w-8">{stars}★</span>
                    <Progress value={percentage} className="flex-1 h-2" />
                    <span className="text-sm text-muted-foreground w-12">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Review Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg">
              <div className="flex items-center gap-2">
                <ThumbsUp className="w-5 h-5 text-green-600" />
                <span className="font-medium">Positive Reviews</span>
              </div>
              <Badge className="bg-green-100 text-green-700">
                {reviews.filter(r => r.rating >= 4).length}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-yellow-600" />
                <span className="font-medium">With Comments</span>
              </div>
              <Badge className="bg-yellow-100 text-yellow-700">
                {reviews.filter(r => r.comment && r.comment.length > 10).length}
              </Badge>
            </div>

            <div className="pt-2">
              <p className="text-sm text-muted-foreground mb-2">Rating Trend</p>
              <p className="text-2xl font-bold text-green-600">+0.3</p>
              <p className="text-xs text-muted-foreground">vs last month</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Buttons */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All Reviews
            </Button>
            {[5, 4, 3, 2, 1].map(stars => (
              <Button
                key={stars}
                variant={filter === stars ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(stars)}
              >
                {stars}★ ({ratingDistribution.find(r => r.stars === stars)?.count || 0})
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Reviews List */}
      <div className="space-y-4">
        {filteredReviews.map((review, index) => (
          <Card key={index}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium">{review.patient_name}</p>
                    <Badge variant="outline" className="text-xs">{review.date}</Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                      />
                    ))}
                  </div>
                </div>
                {review.rating === 5 && (
                  <Badge className="bg-green-100 text-green-700">Excellent</Badge>
                )}
              </div>
              
              <p className="text-muted-foreground">{review.comment}</p>
              
              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm">
                  <ThumbsUp className="w-4 h-4 mr-2" />
                  Helpful
                </Button>
                <Button variant="outline" size="sm">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Reply
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredReviews.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Star className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No reviews found for this filter</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
