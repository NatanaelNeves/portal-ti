import { describe, it, expect, beforeEach } from 'vitest';
import { useToastStore } from './toastStore';

describe('ToastStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useToastStore.setState({ toasts: [] });
  });

  it('should add a toast', () => {
    const store = useToastStore.getState();
    
    store.addToast({
      type: 'success',
      message: 'Test message'
    });

    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].message).toBe('Test message');
    expect(toasts[0].type).toBe('success');
    expect(toasts[0].id).toBeDefined();
  });

  it('should remove a toast', () => {
    const store = useToastStore.getState();
    
    store.addToast({ type: 'info', message: 'Test' });
    const toasts = useToastStore.getState().toasts;
    const toastId = toasts[0].id;

    store.removeToast(toastId);

    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('should add success toast using helper', () => {
    useToastStore.getState().success('Success message');

    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].type).toBe('success');
    expect(toasts[0].message).toBe('Success message');
  });

  it('should add error toast using helper', () => {
    useToastStore.getState().error('Error message');

    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].type).toBe('error');
    expect(toasts[0].message).toBe('Error message');
  });

  it('should add multiple toasts', () => {
    const store = useToastStore.getState();
    
    store.success('First');
    store.error('Second');
    store.warning('Third');

    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(3);
    expect(toasts[0].message).toBe('First');
    expect(toasts[1].message).toBe('Second');
    expect(toasts[2].message).toBe('Third');
  });
});
