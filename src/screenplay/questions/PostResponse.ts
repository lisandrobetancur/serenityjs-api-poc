import { Question } from '@serenity-js/core';
import { LastResponse } from '@serenity-js/rest';

import { Post } from '../models/Post';

/**
 * Questions that let the actor inspect the state of the system
 * based on the last response received.
 */
export class PostResponse {
    static post = () =>
        LastResponse.body<Post>().describedAs('the post in the response');

    static posts = () =>
        LastResponse.body<Post[]>().describedAs('the posts in the response');

    static numberOfPosts = () =>
        Question.about('the number of posts in the response', async actor => {
            const posts = await actor.answer(LastResponse.body<Post[]>());
            return posts.length;
        });
}
