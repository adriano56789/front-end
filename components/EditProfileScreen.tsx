
import React, { useState, useRef, useEffect } from 'react';
import { User, Obra } from '../types';
import { BackIcon, PlusIcon, ChevronRightIcon, TrashIcon, PlayIcon, MaleIcon, FemaleIcon } from './icons';
import { EditTextModal, EditTextAreaModal, EditGenderModal, EditBirthdayModal } from './modals/edit-profile';
import { useTranslation } from '../i18n';
import { api } from '../services/api'; // Import api service
import { base64ConversionService, processUserImages, isValidImageUrl } from '../services/base64ConversionService';

interface EditProfileScreenProps {
  user: User;
  onBack: () => void;
  onSave: (updatedUser: Partial<User>) => void; // Kept for legacy compatibility/local update if needed, but primary logic is now internal
  onPhotoUploaded?: () => void; // Callback para quando nova foto é upload
}

type EditableField = keyof User | null;

const IMAGE_PLACEHOLDER = '/placeholders/avatar-placeholder.svg';

const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
  if (e.currentTarget.src !== IMAGE_PLACEHOLDER && !e.currentTarget.src.includes(IMAGE_PLACEHOLDER)) {
    e.currentTarget.src = IMAGE_PLACEHOLDER;
  }
};


const EditableRow: React.FC<{label: string; value: string | undefined; onClick: () => void; placeholder: string}> = ({label, value, onClick, placeholder}) => (
    <button onClick={onClick} className="flex items-center justify-between w-full py-4 border-b border-zinc-900">
      <span className="text-white text-[15px] font-semibold flex-shrink-0 pr-4">{label}</span>
      <div className="flex items-center space-x-2 flex-grow min-w-0 justify-end">
        <span className="text-zinc-500 text-right truncate text-[14px]">{value || placeholder}</span>
        <ChevronRightIcon className="w-4 h-4 text-zinc-700 flex-shrink-0" />
      </div>
    </button>
);

// Helper function to calculate age
const calculateAge = (dateString: string): number => {
    const parts = dateString.split('/');
    if (parts.length !== 3) return 0;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; 
    const year = parseInt(parts[2], 10);
    
    const birthDate = new Date(year, month, day);
    const today = new Date();
    
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
};

const LevelBadge: React.FC<{ level: number }> = ({ level }) => {
    let bgGrad = 'linear-gradient(to bottom, #f0f0f0 0%, #d0d0d0 50%, #b0b0b0 100%)';
    let textCol = '#1a1a1a';
    let borderColor = '#c0c0c0';

    if (level >= 41) {
        bgGrad = 'linear-gradient(to bottom, #ffe4e6 0%, #f43f5e 50%, #9f1239 100%)';
        textCol = '#ffffff';
        borderColor = '#fda4af';
    } else if (level >= 21) {
        bgGrad = 'linear-gradient(to bottom, #fffbeb 0%, #f59e0b 50%, #78350f 100%)';
        textCol = '#ffffff';
        borderColor = '#fde047';
    } else if (level >= 11) {
        bgGrad = 'linear-gradient(to bottom, #e0e0e0 0%, #a0a0a0 50%, #707070 100%)';
        textCol = '#ffffff';
        borderColor = '#b0b0b0';
    }

    return (
        <span
            style={{
                background: bgGrad,
                borderColor: borderColor,
                color: textCol,
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.4), inset 0 1px 0.5px rgba(255, 255, 255, 0.4)'
            }}
            className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full border text-[10px] font-black font-sans tracking-tight h-[18px] select-none"
        >
            Lvl. {level}
        </span>
    );
};

const AgeBadge: React.FC<{ gender?: 'male' | 'female' | 'not_specified'; age?: number }> = ({ gender = 'female', age }) => {
    const isMale = gender === 'male';
    const displayAge = age && age > 0 ? age : 18;
    return (
        <span className={`text-white text-[11px] font-black px-1.5 py-0.5 rounded flex items-center space-x-1 select-none shadow-[0_1px_2px_rgba(0,0,0,0.3)] h-[18px] ${isMale ? 'bg-[#3b82f6]' : 'bg-[#ec4899]'}`}>
            {isMale ? <MaleIcon className="h-3 w-3 text-white" /> : <FemaleIcon className="h-3 w-3 text-white" />}
            <span>{displayAge}</span>
        </span>
    );
};

const EditProfileScreen: React.FC<EditProfileScreenProps> = ({ user, onBack, onSave, onPhotoUploaded }) => {
  const { t } = useTranslation();
  const [editingField, setEditingField] = useState<EditableField>(null);
  const [formData, setFormData] = useState<Partial<User>>(user);
    const fileInputRef = useRef<HTMLInputElement>(null);
  const dragPhoto = useRef<number>(0);
  const dragOverPhoto = useRef<number>(0);


  // Buscar dados atualizados do perfil do backend
  useEffect(() => {
      const fetchProfileData = async () => {
          try {
              console.log('🔄 [EDIT_PROFILE] Buscando dados atualizados do perfil...');
              
              // Buscar todos os campos do perfil individualmente
              const [
                  nicknameResponse,
                  genderResponse,
                  birthdayResponse,
                  bioResponse,
                  residenceResponse,
                  emotionalStatusResponse,
                  tagsResponse
              ] = await Promise.all([
                  api.profile.getNickname(),
                  api.profile.getGender(),
                  api.profile.getBirthday(),
                  api.profile.getBio(),
                  api.profile.getResidence(),
                  api.profile.getEmotionalStatus(),
                  api.profile.getTags()
              ]);

              // Atualizar formData com os valores mais recentes do backend
              setFormData(prev => ({
                  ...prev,
                  name: nicknameResponse?.value || prev.name,
                  gender: genderResponse?.value || prev.gender,
                  birthday: birthdayResponse?.value || prev.birthday,
                  bio: bioResponse?.value || prev.bio,
                  residence: residenceResponse?.value || prev.residence,
                  emotional_status: emotionalStatusResponse?.value || prev.emotional_status,
                  tags: tagsResponse?.value || prev.tags
              }));

              console.log('✅ [EDIT_PROFILE] Dados do perfil atualizados:', {
                  nickname: nicknameResponse?.value,
                  gender: genderResponse?.value,
                  birthday: birthdayResponse?.value,
                  bio: bioResponse?.value,
                  residence: residenceResponse?.value,
                  emotionalStatus: emotionalStatusResponse?.value,
                  tags: tagsResponse?.value
              });

          } catch (error) {
              console.error('❌ [EDIT_PROFILE] Erro ao buscar dados do perfil:', error);
          }
      };

      fetchProfileData();
  }, [user.id]);

  // Buscar obras do banco (User.obras) - fonte única de verdade
  useEffect(() => {
      const fetchObras = async () => {
          try {
              const freshUser = await api.getCurrentUser();
              if (freshUser?.obras && Array.isArray(freshUser.obras)) {
                  // Processar automaticamente imagens Base64
                  const processedUser = await processUserImages(freshUser);
                  setFormData(prev => ({ 
                    ...prev, 
                    obras: processedUser.obras, 
                    avatarUrl: processedUser.avatarUrl || prev.avatarUrl 
                  }));
              }
          } catch (e) {
              if (user.obras?.length) {
                  // Processar usuário local também
                  const processedUser = await processUserImages(user);
                  setFormData(prev => ({ ...prev, obras: processedUser.obras }));
              }
          }
      };
      fetchObras();
  }, [user.id]);

  const handleGlobalSave = () => {
     onSave(formData);
     onBack();
  };
  
  // Specific Handlers for Modals (Immediate Save)

  const handleNicknameSave = async (value: string) => {
      try {
          await api.profile.updateNickname(value);
          setFormData(prev => ({ ...prev, name: value }));
          setEditingField(null);
      } catch (error) {
      }
  };

  const handleGenderSave = async (value: User['gender']) => {
      try {
          // Cast value as any because generic type safety might fight with specific string literal in User type
          await api.profile.updateGender(value as any);
          setFormData(prev => ({ ...prev, gender: value }));
          setEditingField(null);
      } catch (error) {
      }
  };

  const handleBirthdaySave = async (value: string) => {
      try {
          await api.profile.updateBirthday(value);
          const newAge = calculateAge(value);
          setFormData(prev => ({ ...prev, birthday: value, age: newAge }));
          setEditingField(null);
      } catch (error) {
      }
  };

  const handleBioSave = async (value: string) => {
      try {
          await api.profile.updateBio(value);
          setFormData(prev => ({ ...prev, bio: value }));
          setEditingField(null);
      } catch (error) {
      }
  };

  const handleResidenceSave = async (value: string) => {
      try {
          await api.profile.updateResidence(value);
          setFormData(prev => ({ ...prev, residence: value }));
          setEditingField(null);
      } catch (error) {
      }
  };

  const handleEmotionalStatusSave = async (value: string) => {
       try {
          await api.profile.updateEmotionalStatus(value);
          setFormData(prev => ({ ...prev, emotional_status: value }));
          setEditingField(null);
      } catch (error) {
      }
  };

  const handleTagsSave = async (value: string) => {
       try {
          await api.profile.updateTags(value);
          setFormData(prev => ({ ...prev, tags: value }));
          setEditingField(null);
      } catch (error) {
      }
  };

  const handleProfessionSave = async (value: string) => {
       try {
          // Removido: updateProfession não existe na API
          await api.updateProfile(user.id, { profession: value });
          setFormData(prev => ({ ...prev, profession: value }));
          setEditingField(null);
      } catch (error) {
      }
  };


  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const currentObras = formData.obras || [];
      if (currentObras.length < 8) {
        const file = e.target.files[0];
        const isVideo = file.type.startsWith('video/');

        if (isVideo) {
            // Check video duration
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.onloadedmetadata = async () => {
                window.URL.revokeObjectURL(video.src);
                if (video.duration > 30) {
                    alert("Vídeos não podem ter mais de 30 segundos.");
                    return;
                }
                await processUpload(file, currentObras);
            };
            video.src = URL.createObjectURL(file);
        } else {
            processUpload(file, currentObras);
        }
      }
    }
  };

  const handleAvatarUpload = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp';
    
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const result = await api.uploadAvatar(user.id, file);
        console.log('📸 Resultado do upload:', result);
        
        if (result.success) {
          console.log('🔄 Atualizando avatar para:', result.avatarUrl);
          const newObra = { id: `avatar_${user.id}_${Date.now()}`, url: result.avatarUrl };
          setFormData(prev => ({ 
            ...prev, 
            avatarUrl: result.avatarUrl,
            obras: [newObra, ...(prev.obras || [])]
          }));
          console.log('✅ Avatar atualizado no estado');
          
          // Notificar que nova foto foi upload
          onPhotoUploaded?.();
        } else {
          console.error('❌ Upload falhou:', result);
        }
      } catch (error) {
        console.error('Erro no upload:', error);
      }
    };

    input.click();
  };

  
  const processUpload = async (file: File, currentObras: Obra[]) => {
      try {
          let newObra: Obra;
          let newAvatarUrl: string;

          if (file.type.startsWith('image/')) {
              // Usar upload de avatar (arquivo) - retorna URL persistida, sem bloqueio de Base64
              const uploadResp = await api.uploadAvatar(user.id, file);
              newAvatarUrl = uploadResp.avatarUrl;
              newObra = { id: `obra_${user.id}_${Date.now()}`, url: uploadResp.avatarUrl };
          } else {
              // Vídeo: usar upload de chat (base64 permitido nesta rota)
              const reader = new FileReader();
              const dataUrl = await new Promise<string>((res, rej) => {
                  reader.onload = (e) => res((e.target?.result as string) || '');
                  reader.onerror = rej;
                  reader.readAsDataURL(file);
              });
              if (!dataUrl) return;
              const uploadResp = await api.uploadChatPhoto(user.id, dataUrl);
              newAvatarUrl = currentObras.length === 0 ? uploadResp.url : (currentObras[0]?.url || '');
              newObra = { id: `obra_${user.id}_${Date.now()}`, url: uploadResp.url };
          }

          const newObras = [newObra, ...currentObras];
          const finalAvatarUrl = newObras.length > 0 ? newObras[0].url : newAvatarUrl;

          const updateResp = await api.updateProfile(user.id, { obras: newObras, avatarUrl: finalAvatarUrl });
          if (updateResp.success && updateResp.user) {
              setFormData(prev => ({ ...prev, ...updateResp.user }));
          } else {
              setFormData(prev => ({ ...prev, obras: newObras, avatarUrl: finalAvatarUrl }));
          }
      } catch (e) {
          console.error('Erro no upload:', e);
      }
  }

  const handleDeletePhoto = async (indexToDelete: number) => {
      const obraToDelete = formData.obras?.[indexToDelete];
      if (!obraToDelete) return;

      const newObras = formData.obras?.filter((_, index) => index !== indexToDelete) || [];
      const newAvatarUrl = newObras.length > 0 ? newObras[0].url : '';

      // Atualização otimista na UI
      setFormData(prev => ({ ...prev, obras: newObras, avatarUrl: newAvatarUrl }));

      try {
          // Usar endpoint dedicado DELETE /user/photo/:photoId - remove do banco
          await api.profile.deleteImage(obraToDelete.id, user.id);
      } catch (error) {
          console.error('Erro ao remover foto:', error);
          setFormData(prev => ({ ...prev, obras: formData.obras, avatarUrl: formData.avatarUrl }));
      }
  };

  const handleSort = async () => {
    const obras = [...(formData.obras || [])];
    if (dragPhoto.current === dragOverPhoto.current) return;
    
    // Perform the swap
    const draggedObra = obras.splice(dragPhoto.current, 1)[0];
    obras.splice(dragOverPhoto.current, 0, draggedObra);

    const wasAvatarChanged = dragPhoto.current === 0 || dragOverPhoto.current === 0;

    // Reset refs
    dragPhoto.current = 0;
    dragOverPhoto.current = 0;

    // Optimistic Update
    const newAvatarUrl = obras.length > 0 ? obras[0].url : '';
    setFormData(prev => ({ ...prev, obras, ...(wasAvatarChanged ? { avatarUrl: newAvatarUrl } : {}) }));

    // API Call
    try {
        // Removido: reordenamento de imagens (API não existe)
        
        if (wasAvatarChanged) {
            await api.updateProfile(user.id, { avatarUrl: newAvatarUrl });
        }
    } catch (error) {
    }
  };


  const getGenderLabel = (gender?: 'male' | 'female' | 'not_specified') => {
    if (gender === 'male') return t('common.male');
    if (gender === 'female') return t('common.female');
    return t('common.notSpecified');
  };

  return (
    <div className="absolute inset-0 bg-[#000] z-50 flex flex-col text-white">
      <header className="flex items-center justify-between p-4 flex-shrink-0 border-b border-zinc-900 bg-black">
        <button onClick={onBack} className="p-1"><BackIcon className="w-6 h-6" /></button>
        <h1 className="text-lg font-bold flex-grow text-center">{t('editProfile.title')}</h1>
        <button onClick={handleGlobalSave} className="font-bold text-base text-purple-500">Concluir</button>
      </header>

      <main className="flex-grow overflow-y-auto px-4 no-scrollbar bg-black">
        <div className="my-4 bg-zinc-900/60 text-zinc-300 text-[13px] p-3 rounded-xl flex items-center space-x-3">
            <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
            </div>
            <span className="leading-tight">{t('editProfile.uploadNotice')}</span>
        </div>

        <div className="py-2">
          <div className="grid grid-cols-4 gap-2">
            {(formData.obras || []).map((obra, index) => {
              // Robust check for video type
              const isVideo = obra.url.toLowerCase().includes('data:video') || 
                             obra.url.toLowerCase().endsWith('.mp4') || 
                             obra.url.toLowerCase().endsWith('.webm');
                             
              return (
                <div
                  key={obra.id}
                  className="relative aspect-square rounded-lg group overflow-hidden bg-[#2c2c2e]"
                  draggable
                  onDragStart={() => (dragPhoto.current = index)}
                  onDragEnter={() => (dragOverPhoto.current = index)}
                  onDragEnd={handleSort}
                  onDragOver={e => e.preventDefault()}
                >
                  {isVideo ? (
                      <div className="relative w-full h-full">
                        <video 
                            src={obra.url} 
                            className="w-full h-full object-cover" 
                            muted 
                            playsInline
                            loop
                            // Add autoplay on hover for desktop, or just poster for mobile feel
                            onMouseOver={(e) => (e.target as HTMLVideoElement).play()}
                            onMouseOut={(e) => (e.target as HTMLVideoElement).pause()}
                        />
                         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                            <PlayIcon className="w-6 h-6 text-white/80" />
                        </div>
                      </div>
                  ) : (
                      <img 
                        src={isValidImageUrl(obra.url) ? obra.url : IMAGE_PLACEHOLDER} 
                        onError={handleImageError} 
                        alt={`Profile photo ${index + 1}`} 
                        className="w-full h-full object-cover" 
                      />
                  )}
                  {index === 0 && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white py-0.5 text-[9px] font-bold text-center">Retrato</div>
                  )}
                  {index === 0 && (
                    <div className="absolute top-1 right-1 bg-black/40 rounded-full p-0.5 z-10">
                      <div className="w-4 h-4 rounded-full overflow-hidden flex items-center justify-center">
                        <img src={`https://flagcdn.com/${(user.country || 'br').toLowerCase()}.svg`} alt={user.country || 'br'} className="w-full h-full object-cover" />
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => handleDeletePhoto(index)}
                    className="absolute top-1 left-1 bg-black/20 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    aria-label={`Delete photo ${index + 1}`}
                  >
                    <TrashIcon className="w-3 h-3" />
                  </button>
                </div>
              );
            })}

            {(formData.obras?.length || 0) < 8 && (
              <button
                onClick={() => {
                  // Se for a primeira foto (avatar), usa o novo sistema
                  if ((formData.obras?.length || 0) === 0) {
                    handleAvatarUpload();
                  } else {
                    fileInputRef.current?.click();
                  }
                }}
                className="aspect-square rounded-lg bg-zinc-900 flex items-center justify-center hover:bg-zinc-800 transition-colors"
              >
                <PlusIcon className="w-6 h-6 text-zinc-600" />
              </button>
            )}
          </div>
          <input type="file" className="hidden" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*,video/*" />
          <p className="text-[11px] text-zinc-500 mt-2 text-center">{t('editProfile.uploadHelper', { count: formData.obras?.length || 0 })}</p>
        </div>


        <div className="mt-4">
            <EditableRow label={t('editProfile.nickname')} value={formData.name} onClick={() => setEditingField('name')} placeholder={t('editProfile.notSpecified')} />
            <EditableRow label={t('editProfile.gender')} value={getGenderLabel(formData.gender)} onClick={() => setEditingField('gender')} placeholder={t('editProfile.notSpecified')} />
            <EditableRow label={t('editProfile.birthday')} value={formData.birthday} onClick={() => setEditingField('birthday')} placeholder={t('editProfile.notSpecified')} />
            <EditableRow label={t('editProfile.bio')} value={formData.bio} onClick={() => setEditingField('bio')} placeholder={t('editProfile.notSpecified')} />
            <EditableRow label={t('editProfile.residence')} value={formData.residence} onClick={() => setEditingField('residence')} placeholder={t('editProfile.notSpecified')} />
            <EditableRow label={t('editProfile.emotionalStatus')} value={formData.emotional_status} onClick={() => setEditingField('emotional_status')} placeholder={t('editProfile.notSpecified')} />
            <EditableRow label={t('editProfile.tags')} value={formData.tags} onClick={() => setEditingField('tags')} placeholder={t('editProfile.notSpecified')} />
            <EditableRow label={t('editProfile.profession')} value={formData.profession} onClick={() => setEditingField('profession')} placeholder={t('editProfile.notSpecified')} />
        </div>
      </main>

      {/* Modals - Updated to call specific save handlers */}
      <EditTextModal 
        isOpen={editingField === 'name'}
        onClose={() => setEditingField(null)}
        onSave={handleNicknameSave}
        title={t('editProfile.nickname')}
        initialValue={formData.name || ''}
      />
      <EditGenderModal 
        isOpen={editingField === 'gender'}
        onClose={() => setEditingField(null)}
        onSave={handleGenderSave}
        initialValue={formData.gender || 'not_specified'}
      />
      <EditBirthdayModal
        isOpen={editingField === 'birthday'}
        onClose={() => setEditingField(null)}
        onSave={handleBirthdaySave}
        initialValue={formData.birthday || ''}
      />
      <EditTextAreaModal
        isOpen={editingField === 'bio'}
        onClose={() => setEditingField(null)}
        onSave={handleBioSave}
        title={t('editProfile.bio')}
        initialValue={formData.bio || ''}
      />
      <EditTextModal
        isOpen={editingField === 'residence'}
        onClose={() => setEditingField(null)}
        onSave={handleResidenceSave}
        title={t('editProfile.residence')}
        initialValue={formData.residence || ''}
      />
       <EditTextModal
        isOpen={editingField === 'emotional_status'}
        onClose={() => setEditingField(null)}
        onSave={handleEmotionalStatusSave}
        title={t('editProfile.emotionalStatus')}
        initialValue={formData.emotional_status || ''}
      />
      <EditTextModal
        isOpen={editingField === 'tags'}
        onClose={() => setEditingField(null)}
        onSave={handleTagsSave}
        title={t('editProfile.tags')}
        initialValue={formData.tags || ''}
      />
       <EditTextModal
        isOpen={editingField === 'profession'}
        onClose={() => setEditingField(null)}
        onSave={handleProfessionSave}
        title={t('editProfile.profession')}
        initialValue={formData.profession || ''}
      />

      
    </div>
  );
};

export default EditProfileScreen;
