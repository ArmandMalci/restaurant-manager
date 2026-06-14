import 'reflect-metadata';
import { Controller, Get } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { CurrentUser } from './current-user.decorator';

@Controller()
class TestController {
  @Get()
  public route(@CurrentUser() _user: unknown) {}
}

describe('CurrentUser decorator', () => {
  function getFactory() {
    const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, TestController, 'route');
    const [key] = Object.keys(metadata);

    return metadata[key].factory as (_data: unknown, ctx: unknown) => unknown;
  }

  function makeCtx(user: unknown) {
    return { switchToHttp: () => ({ getRequest: () => ({ user }) }) };
  }

  it('extracts request.user from the execution context', () => {
    const factory = getFactory();
    const user = { id: 'uid-1', email: 'a@b.com', role: 'manager' };

    expect(factory(undefined, makeCtx(user))).toEqual(user);
  });

  it('returns undefined when request has no user (unauthenticated)', () => {
    const factory = getFactory();

    expect(factory(undefined, makeCtx(undefined))).toBeUndefined();
  });
});
