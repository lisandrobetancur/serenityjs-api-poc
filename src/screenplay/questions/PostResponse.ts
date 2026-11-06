import { Question } from '@serenity-js/core';
import { LastResponse } from '@serenity-js/rest';

import { Post } from '../models/Post';

/**
 * Preguntas (Questions) que permiten al actor consultar el estado del sistema
 * a partir de la última respuesta recibida.
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
