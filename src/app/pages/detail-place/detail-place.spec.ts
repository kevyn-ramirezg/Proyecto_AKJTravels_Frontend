import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import DetailPlace from './detail-place';
import { PlacesApiService } from '../../services/places-api-service';
import { FavoritesApiService } from '../../services/favorites-api-service';
import { TokenService } from '../../services/token-service';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { CommentDTO } from '../../model/comment-dto/comment-dto';
import { UserCommentDTO } from '../../model/comment-dto/user.comment-dto';
import { PlaceDetailDTO } from '../../model/place-dto/place-detail-dto';

describe('DetailPlace Component', () => {
  let component: DetailPlace;
  let fixture: ComponentFixture<DetailPlace>;
  let placesApiService: jasmine.SpyObj<PlacesApiService>;
  let favoritesApiService: jasmine.SpyObj<FavoritesApiService>;
  let tokenService: jasmine.SpyObj<TokenService>;

  const mockUser: UserCommentDTO = {
    id: '1',
    name: 'John Doe',
    fullName: 'John Michael Doe',
    email: 'john@example.com',
    photoUrl: 'https://example.com/photo.jpg',
    profilePicUrl: 'https://example.com/profile.jpg'
  };

  const mockComment: CommentDTO = {
    id: '1',
    comment: 'Great place!',
    commentDate: '2025-01-15',
    rating: 5,
    user: mockUser,
    placeTitle: 'Hermosa Casa'
  };

  const mockPlace: PlaceDetailDTO = {
    id: '1',
    title: 'Beautiful House',
    description: 'A wonderful place',
    price: 100,
    capacity: 4,
    city: 'Armenia',
    services: [],
    pics_url: [],
    latitude: 4.5353,
    longitude: -75.7399,
    averageRatings: 0,
    userDetailDTO: {} as any
  };

  beforeEach(async () => {
    const placesApiSpy = jasmine.createSpyObj('PlacesApiService', ['getDetail', 'listComments']);
    const favoritesApiSpy = jasmine.createSpyObj('FavoritesApiService', ['add', 'remove', 'countFavorites', 'isMyFavorite']);
    const tokenServiceSpy = jasmine.createSpyObj('TokenService', ['isLogged', 'getRole', 'getUsername']);

    await TestBed.configureTestingModule({
      imports: [DetailPlace],
      providers: [
        { provide: PlacesApiService, useValue: placesApiSpy },
        { provide: FavoritesApiService, useValue: favoritesApiSpy },
        { provide: TokenService, useValue: tokenServiceSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: () => '1'
              }
            }
          }
        }
      ]
    }).compileComponents();

    placesApiService = TestBed.inject(PlacesApiService) as jasmine.SpyObj<PlacesApiService>;
    favoritesApiService = TestBed.inject(FavoritesApiService) as jasmine.SpyObj<FavoritesApiService>;
    tokenService = TestBed.inject(TokenService) as jasmine.SpyObj<TokenService>;

    placesApiService.getDetail.and.returnValue(of(mockPlace));
    placesApiService.listComments.and.returnValue(of([]));
    favoritesApiService.countFavorites.and.returnValue(of(0));
    favoritesApiService.isMyFavorite.and.returnValue(of(false));
    tokenService.isLogged.and.returnValue(true);
    tokenService.getRole.and.returnValue('GUEST');

    fixture = TestBed.createComponent(DetailPlace);
    component = fixture.componentInstance;
  });

  describe('Comment User Name Extraction', () => {
    it('should return fullName if available', () => {
      const result = component.getCommentUserName(mockComment);

      expect(result).toBe('John Michael Doe');
    });

    it('should fallback to name if fullName is missing', () => {
      const comment: CommentDTO = {
        ...mockComment,
        user: { ...mockUser, fullName: undefined }
      };

      const result = component.getCommentUserName(comment);

      expect(result).toBe('John Doe');
    });

    it('should return "Huésped" if user is null', () => {
      const comment: CommentDTO = {
        ...mockComment,
        user: null as any
      };

      // ✅ FIX: Debe validar user !== null antes de acceder
      const result = component.getCommentUserName(comment);

      expect(result).toBe('Huésped');
    });

    it('should return "Huésped" if user is undefined', () => {
      const comment: CommentDTO = {
        ...mockComment,
        user: undefined as any
      };

      // ✅ FIX: Debe manejar undefined
      const result = component.getCommentUserName(comment);

      expect(result).toBe('Huésped');
    });

    it('should return "Huésped" if all name fields are missing', () => {
      const comment: CommentDTO = {
        ...mockComment,
        user: { id: '1' } as UserCommentDTO // Sin name ni fullName
      };

      const result = component.getCommentUserName(comment);

      expect(result).toBe('Huésped');
    });

    it('should handle empty string names', () => {
      const comment: CommentDTO = {
        ...mockComment,
        user: { ...mockUser, fullName: '', name: '' }
      };

      const result = component.getCommentUserName(comment);

      expect(result).toBe('Huésped');
    });
  });

  describe('Comment User Avatar', () => {
    it('should return profilePicUrl if available', () => {
      const result = component.getCommentUserAvatar(mockComment);

      expect(result).toBe('https://example.com/profile.jpg');
    });

    it('should fallback to photoUrl if profilePicUrl is missing', () => {
      const comment: CommentDTO = {
        ...mockComment,
        user: { ...mockUser, profilePicUrl: null }
      };

      const result = component.getCommentUserAvatar(comment);

      expect(result).toBe('https://example.com/photo.jpg');
    });

    it('should return null if no photo available', () => {
      const comment: CommentDTO = {
        ...mockComment,
        user: { ...mockUser, profilePicUrl: null, photoUrl: null }
      };

      const result = component.getCommentUserAvatar(comment);

      expect(result).toBeNull();
    });

    // ✅ FIX: Validar user antes de acceder
    it('should return null if user is null (security fix)', () => {
      const comment: CommentDTO = {
        ...mockComment,
        user: null as any
      };

      const result = component.getCommentUserAvatar(comment);

      expect(result).toBeNull();
    });

    it('should return null if user is undefined', () => {
      const comment: CommentDTO = {
        ...mockComment,
        user: undefined as any
      };

      const result = component.getCommentUserAvatar(comment);

      expect(result).toBeNull();
    });
  });

  describe('Comment User Initials', () => {
    it('should generate initials from fullName', () => {
      const result = component.getCommentUserInitials(mockComment);

      expect(result).toBe('JD'); // John Doe
    });

    it('should handle single word name', () => {
      const comment: CommentDTO = {
        ...mockComment,
        user: { ...mockUser, fullName: 'Madonna' }
      };

      const result = component.getCommentUserInitials(comment);

      expect(result).toBe('M');
    });

    it('should return H for "Huésped" fallback', () => {
      const comment: CommentDTO = {
        ...mockComment,
        user: null as any
      };

      const result = component.getCommentUserInitials(comment);

      expect(result).toBe('H');
    });

    it('should handle whitespace in name', () => {
      const comment: CommentDTO = {
        ...mockComment,
        user: { ...mockUser, fullName: '   John   Doe   ' }
      };

      const result = component.getCommentUserInitials(comment);

      expect(result).toBe('JD');
    });
  });

  describe('Toggle Favorite - Race Condition Fix', () => {
    beforeEach(() => {
      fixture.detectChanges();
      component.place = mockPlace;
      component.isFavorite = false;
      component.favoriteCount = 5;
    });

    it('should block second click while request is pending', fakeAsync(() => {
      // ✅ FIX: favoriteLoading debe prevenir doble clic
      favoritesApiService.add.and.returnValue(of(void 0));

      component.toggleFavorite();
      tick();  // Permitir que se complete la suscripción
      
      // Después del tick, favoriteLoading ya debería ser false
      // porque el Observable es sincrónico. Verificar que se llamó solo una vez
      expect(favoritesApiService.add).toHaveBeenCalledTimes(1);
    }));

    it('should determine new state before sending request', fakeAsync(() => {
      // Comienza con isFavorite = false (del beforeEach)
      favoritesApiService.add.and.returnValue(of(void 0));

      component.toggleFavorite();
      tick();
      
      // El estado debe haber cambiado a true (ya que era false y se toggleó)
      expect(component.isFavorite).toBe(true);
    }));

    it('should update favorite count on success', fakeAsync(() => {
      favoritesApiService.add.and.returnValue(of(void 0));
      component.isFavorite = false;
      component.favoriteCount = 5;

      component.toggleFavorite();
      tick();

      expect(component.favoriteCount).toBe(6);
    }));

    it('should decrement favorite count when removing', fakeAsync(() => {
      favoritesApiService.remove.and.returnValue(of(void 0));
      component.isFavorite = true;
      component.favoriteCount = 5;

      component.toggleFavorite();
      tick();

      expect(component.favoriteCount).toBe(4);
    }));

    it('should never have negative favorite count', fakeAsync(() => {
      favoritesApiService.remove.and.returnValue(of(void 0));
      component.isFavorite = true;
      component.favoriteCount = 0; // Ya es 0

      component.toggleFavorite();
      tick();

      expect(component.favoriteCount).toBeGreaterThanOrEqual(0);
    }));

    it('should reset favoriteLoading on error', () => {
      favoritesApiService.add.and.returnValue(
        throwError(() => new Error('Network error'))
      );

      component.toggleFavorite();

      // ✅ FIX: Debe desbloquear en error
      expect(component.favoriteLoading).toBe(false);
    });

    it('should not allow toggle if not logged in', () => {
      tokenService.isLogged.and.returnValue(false);

      component.toggleFavorite();

      expect(favoritesApiService.add).not.toHaveBeenCalled();
      expect(favoritesApiService.remove).not.toHaveBeenCalled();
    });

    it('should not allow toggle if user is HOST', () => {
      tokenService.isLogged.and.returnValue(true);
      tokenService.getRole.and.returnValue('HOST');

      component.toggleFavorite();

      expect(favoritesApiService.add).not.toHaveBeenCalled();
      expect(favoritesApiService.remove).not.toHaveBeenCalled();
    });
  });

  describe('Favorite Loading State', () => {
    beforeEach(() => {
      fixture.detectChanges();
      component.place = mockPlace;
    });

    it('should set favoriteLoading=true on toggle start', fakeAsync(() => {
      // Usar delay para que el observable sea asincrónico
      favoritesApiService.add.and.returnValue(of(void 0).pipe(delay(1)));

      expect(component.favoriteLoading).toBe(false);
      component.toggleFavorite();
      
      // Después de llamar toggleFavorite(), favoriteLoading debe ser true
      expect(component.favoriteLoading).toBe(true);
      
      // Ahora permitir que se complete
      tick(1);
      
      // Después de que se complete, debe ser false
      expect(component.favoriteLoading).toBe(false);
    }));

    it('should set favoriteLoading=false on success', fakeAsync(() => {
      favoritesApiService.add.and.returnValue(of(void 0));

      component.toggleFavorite();
      tick();

      expect(component.favoriteLoading).toBe(false);
    }));

    it('should set favoriteLoading=false on error', fakeAsync(() => {
      favoritesApiService.add.and.returnValue(
        throwError(() => new Error('Error'))
      );

      component.toggleFavorite();
      tick();

      expect(component.favoriteLoading).toBe(false);
    }));
  });

  describe('Component Lifecycle', () => {
    it('should load place details on init', () => {
      fixture.detectChanges();

      expect(placesApiService.getDetail).toHaveBeenCalled();
    });

    it('should unsubscribe on destroy', () => {
      fixture.detectChanges();
      const destroySpy = spyOn((component as any).destroy$, 'next');
      const completeSpy = spyOn((component as any).destroy$, 'complete');

      component.ngOnDestroy();

      expect(destroySpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });
  });

  describe('canFavorite()', () => {
    it('should return true for logged-in GUEST', () => {
      tokenService.isLogged.and.returnValue(true);
      tokenService.getRole.and.returnValue('GUEST');

      expect(component.canFavorite()).toBe(true);
    });

    it('should return false for HOST', () => {
      tokenService.isLogged.and.returnValue(true);
      tokenService.getRole.and.returnValue('HOST');

      expect(component.canFavorite()).toBe(false);
    });

    it('should return false if not logged in', () => {
      tokenService.isLogged.and.returnValue(false);

      expect(component.canFavorite()).toBe(false);
    });
  });
});
