declare module 'supertest' {
  interface Response {
    status: number;
    statusCode: number;
    body: any;
    text: string;
    headers: Record<string, string | string[] | undefined>;
  }

  interface Test extends PromiseLike<Response> {
    set(field: string | Record<string, string>, val?: string): this;
    send(data?: string | Record<string, unknown> | Buffer): this;
    query(val: Record<string, string | number | boolean>): this;
    field(name: string, val: string | number | boolean): this;
    attach(
      field: string,
      file: Buffer | string,
      options?: string | { filename?: string; contentType?: string }
    ): this;
    expect(status: number, body?: unknown): this;
  }

  interface SuperTestStatic {
    get(url: string): Test;
    post(url: string): Test;
    put(url: string): Test;
    patch(url: string): Test;
    delete(url: string): Test;
    del(url: string): Test;
    head(url: string): Test;
    options(url: string): Test;
  }

  function request(app: unknown, options?: Record<string, unknown>): SuperTestStatic;
  export = request;
}
