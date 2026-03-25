import { useEffect, useState } from 'react';
import { api } from '../../api/axios';
import { ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface Review {
    id: number;
    reviewerName: string;
    isRecommended: boolean;
    comment: string;
    date: string;
}

export const TeamReviews = ({ teamId, ownerId }: { teamId: string, ownerId: number }) => {
    const { user } = useAuth();
    const [reviews, setReviews] = useState<Review[]>([]);
    const [showForm, setShowForm] = useState(false);

    const [recommend, setRecommend] = useState(true);
    const [comment, setComment] = useState('');

    const fetchReviews = async () => {
        try {
            const res = await api.get(`/teams/${teamId}/reviews`);
            setReviews(res.data);
        } catch (err) { console.error(err); }
    };

    useEffect(() => {
        if (teamId) fetchReviews();
    }, [teamId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post(`/teams/${teamId}/reviews`, { isRecommended: recommend, comment });
            setShowForm(false);
            setComment('');
            fetchReviews();
        } catch (error: any) {
            alert(error.response?.data?.message || "Failed to post review.");
        }
    };

    const positiveCount = reviews.filter(r => r.isRecommended).length;
    const percentage = reviews.length > 0 ? Math.round((positiveCount / reviews.length) * 100) : 0;

    const canReview = user && user.id !== ownerId;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <MessageSquare className="text-[#ff4655]" /> Team Reputation
                </h2>
                {reviews.length > 0 && (
                    <div className="bg-[#1f2937] px-3 py-1 rounded-lg border border-gray-600">
                        <span className="text-[#ff4655] font-bold">{percentage}%</span>
                        <span className="text-gray-400 text-sm ml-1">Recommend</span>
                    </div>
                )}
            </div>

            {canReview && !showForm && (
                <button
                    onClick={() => setShowForm(true)}
                    className="w-full py-3 border border-dashed border-gray-600 rounded-lg text-gray-400 hover:text-white hover:border-gray-400 transition-all text-sm"
                >
                    + Write a Review
                </button>
            )}

            {showForm && (
                <form onSubmit={handleSubmit} className="bg-[#1f2937] p-4 rounded-lg border border-gray-600 space-y-4">
                    <div className="flex gap-4">
                        <button
                            type="button"
                            onClick={() => setRecommend(true)}
                            className={`flex-1 py-2 rounded flex items-center justify-center gap-2 border ${recommend ? 'bg-green-500/10 border-green-500 text-green-500' : 'border-gray-600 text-gray-500'}`}
                        >
                            <ThumbsUp size={16} /> Recommend
                        </button>
                        <button
                            type="button"
                            onClick={() => setRecommend(false)}
                            className={`flex-1 py-2 rounded flex items-center justify-center gap-2 border ${!recommend ? 'bg-red-500/10 border-red-500 text-red-500' : 'border-gray-600 text-gray-500'}`}
                        >
                            <ThumbsDown size={16} /> Avoid
                        </button>
                    </div>
                    <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="How was your experience playing with this team?"
                        className="w-full bg-[#0f1923] border border-gray-600 rounded p-3 text-white focus:border-[#ff4655] outline-none text-sm"
                        rows={3}
                        required
                    />
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 text-sm hover:text-white px-3">Cancel</button>
                        <button type="submit" className="bg-[#ff4655] text-white px-4 py-1.5 rounded text-sm font-bold">Post Review</button>
                    </div>
                </form>
            )}

            <div className="space-y-3">
                {reviews.map((review) => (
                    <div key={review.id} className="bg-[#1f2937]/50 border border-gray-700 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <div className={`mt-1 ${review.isRecommended ? 'text-green-500' : 'text-red-500'}`}>
                                {review.isRecommended ? <ThumbsUp size={18} /> : <ThumbsDown size={18} />}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-white font-bold text-sm">{review.reviewerName}</span>
                                    <span className="text-gray-500 text-xs">{review.date}</span>
                                </div>
                                <p className="text-gray-300 text-sm mt-1">{review.comment}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};