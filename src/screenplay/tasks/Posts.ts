import { Task } from '@serenity-js/core';
import { DeleteRequest, GetRequest, PostRequest, Send } from '@serenity-js/rest';

import { NewPost } from '../models/Post';

/**
 * Tareas (Tasks) de negocio sobre el recurso /posts.
 * Cada tarea describe QUÉ quiere lograr el actor, no CÓMO se hace la petición HTTP.
 */
export class Posts {
    static fetchAll = () =>
        Task.where(`#actor fetches all posts`,
            Send.a(GetRequest.to('/posts')),
        );

    static fetchById = (id: number) =>
        Task.where(`#actor fetches post #${id}`,
            Send.a(GetRequest.to(`/posts/${id}`)),
        );

    static create = (post: NewPost) =>
        Task.where(`#actor creates a post titled "${post.title}"`,
            Send.a(PostRequest.to('/posts').with(post).using({
                headers: { 'Content-Type': 'application/json; charset=UTF-8' },
            })),
        );

    static remove = (id: number) =>
        Task.where(`#actor deletes post #${id}`,
            Send.a(DeleteRequest.to(`/posts/${id}`)),
        );
}
