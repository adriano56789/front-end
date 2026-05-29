# XP System — LiveGo

## Gift XP

**Formula:** `giftPrice * quantity * 10`

- Every time a user sends a gift, they earn XP equal to `totalCost * 10`.
- Example: sending a 10-diamond gift (1x) earns 100 XP.

## Purchase XP

**Formula:** `amountBRL * 10`

- Every time a user purchases diamonds via Mercado Pago, they earn XP equal to `amount * 10`.
- Example: a R$10 purchase earns 100 XP.

## Level Up

**Formula:** `level = Math.floor(totalXP / 1000) + 1`

- Every 1000 XP grants one level.
- Example: 2500 XP → level 3.
