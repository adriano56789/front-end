#!/bin/bash

echo "🔧 CRIANDO COLEÇÕES VAZIAS NO MONGODB LIVEGO"

# Conectar ao MongoDB local
MONGO_URI="mongodb://admin:adriano123@127.0.0.1:27017/api?authSource=admin"

# Lista de coleções baseadas nos models TypeScript
COLLECTIONS=(
    "activityhooks"
    "appversions"
    "bannedentities"
    "beautyeffects"
    "beautysettings"
    "birthdays"
    "blocks"
    "chats"
    "chatmessages"
    "comments"
    "conversations"
    "follows"
    "followers"
    "frames"
    "friendships"
    "gifts"
    "giftnotificationsettings"
    "gifttransactions"
    "invitations"
    "likes"
    "livenotifications"
    "manualtransmissaos"
    "messages"
    "orders"
    "photos"
    "profilephotos"
    "profileupdates"
    "purchaserecords"
    "shopitems"
    "streamhistories"
    "streamkeyassociations"
    "streamlikes"
    "streamers"
    "streamsessions"
    "users"
    "useractivities"
    "useravatars"
    "userframes"
    "userindexes"
    "userinventories"
    "userlevels"
    "userpermissions"
    "userphotos"
    "userstatuses"
    "uservideos"
    "visitors"
    "withdrawals"
    "zoomsettings"
)

echo "📋 Total de coleções para criar: ${#COLLECTIONS[@]}"

# Criar cada coleção
for collection in "${COLLECTIONS[@]}"; do
    echo "🔍 Verificando coleção: $collection"
    
    # Verificar se coleção já existe
    exists=$(mongosh "$MONGO_URI" --quiet --eval "db.getCollectionNames().includes('$collection')" 2>/dev/null)
    
    if [ "$exists" = "true" ]; then
        echo "⚠️  $collection (já existe)"
    else
        # Criar coleção vazia
        mongosh "$MONGO_URI" --quiet --eval "
            try {
                db.createCollection('$collection');
                print('✅ $collection (criada)');
            } catch (error) {
                print('❌ Erro ao criar $collection: ' + error.message);
            }
        " 2>/dev/null
    fi
done

echo ""
echo "📊 VERIFICANDO COLEÇÕES CRIADAS:"

# Listar todas as coleções no final
mongosh "$MONGO_URI" --quiet --eval "
    const collections = db.getCollectionNames();
    print('Total de coleções: ' + collections.length);
    collections.forEach(function(name, index) {
        const count = db.getCollection(name).countDocuments();
        print('  ' + (index + 1) + '. ' + name + ' (' + count + ' documentos)');
    });
"

echo ""
echo "✅ SCRIPT CONCLUÍDO!"
echo "🎯 Banco livego pronto para uso!"
