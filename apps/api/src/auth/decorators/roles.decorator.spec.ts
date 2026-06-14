import 'reflect-metadata';
import { ROLES_KEY, Roles } from './roles.decorator';

describe('Roles decorator', () => {
  it('ROLES_KEY is the sentinel value "roles"', () => {
    expect(ROLES_KEY).toBe('roles');
  });

  it('KEY property on decorator matches ROLES_KEY', () => {
    expect(Roles('manager').KEY).toBe(ROLES_KEY);
  });

  it('sets metadata with a single role on a class', () => {
    class TestClass {}
    Roles('manager')(TestClass);
    expect(Reflect.getMetadata(ROLES_KEY, TestClass)).toEqual(['manager']);
  });

  it('sets metadata with multiple roles on a class', () => {
    class TestClass {}
    Roles('manager', 'kitchen')(TestClass);
    expect(Reflect.getMetadata(ROLES_KEY, TestClass)).toEqual(['manager', 'kitchen']);
  });

  it('sets metadata with empty array when no roles given', () => {
    class TestClass {}
    Roles()(TestClass);
    expect(Reflect.getMetadata(ROLES_KEY, TestClass)).toEqual([]);
  });
});
