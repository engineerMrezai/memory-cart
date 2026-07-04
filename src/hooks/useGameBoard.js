import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {useQueries} from '@tanstack/react-query'
import {pickAnimals} from '../data/animals.js'
import {fetchAnimalGif} from '../services/giphy.js'
import {useLocalStorage} from './useLocalStorage.js'

const MATCH_POINTS = 100
const MISMATCH_PENALTY = 5
const FLIP_BACK_DELAY = 800

function buildDeck(animalGifMap) {
    const deck = []
    let counter = 0

    Object.entries(animalGifMap).forEach(([animal, gifUrl]) => {
        for (let copy = 0; copy < 2; copy += 1) {
            counter += 1
            deck.push({
                id: `${animal}-${copy}-${counter}`,
                animal,
                gifUrl,
                isFlipped: false,
                isMatched: false
            })
        }
    })

    return deck.sort(() => Math.random() - 0.5)
}

export function useGameBoard(boardSize, onChangeBoardSize) {
    const [animals, setAnimals] = useState([])
    const [cards, setCards] = useState([])
    const [selectedIds, setSelectedIds] = useState([])
    const [moves, setMoves] = useState(0)
    const [score, setScore] = useState(0)
    const [isChecking, setIsChecking] = useState(false)
    const [isWon, setIsWon] = useState(false)
    const [bestScore, setBestScore] = useLocalStorage(
        `memory-card.best-score.${boardSize}`,
        0
    )
    const flipBackTimer = useRef(null)

    const gifQueries = useQueries({
        queries: animals.map((animal) => ({
            queryKey: ['animalGif', animal],
            queryFn: () => fetchAnimalGif(animal),
            staleTime: Infinity,
            retry: false,
            enabled: animals.length > 0
        }))
    })

    const isLoading =
        animals.length > 0 && gifQueries.some((q) => q.isLoading || q.isFetching)

    const allGifsSettled =
        animals.length > 0 && gifQueries.every((q) => q.isSuccess || q.isError)

    const startGame = useCallback((size) => {
        if (flipBackTimer.current) {
            clearTimeout(flipBackTimer.current)
        }
        const pairCount = size / 2
        setIsWon(false)
        setMoves(0)
        setScore(0)
        setSelectedIds([])
        setCards([])
        setAnimals(pickAnimals(pairCount))
    }, [])

    useEffect(() => {
        if (!allGifsSettled) return

        const animalGifMap = {}
        animals.forEach((animal, index) => {
            const result = gifQueries[index].data
            animalGifMap[animal] = result?.url || ''
        })

        setCards(buildDeck(animalGifMap))
    }, [allGifsSettled])

    const changeBoardSize = useCallback(
        (size) => {
            onChangeBoardSize(size)
            startGame(size)
        },
        [onChangeBoardSize, startGame]
    )

    const restart = useCallback(() => {
        if (boardSize) startGame(boardSize)
    }, [boardSize, startGame])

    const flipCard = useCallback(
        (id) => {
            if (isChecking || isWon) return

            setCards((prevCards) => {
                const target = prevCards.find((card) => card.id === id)
                if (!target || target.isFlipped || target.isMatched) {
                    return prevCards
                }
                return prevCards.map((card) =>
                    card.id === id ? {...card, isFlipped: true} : card
                )
            })

            setSelectedIds((prevSelected) => {
                if (prevSelected.includes(id) || prevSelected.length >= 2) {
                    return prevSelected
                }
                return [...prevSelected, id]
            })
        },
        [isChecking, isWon]
    )

    useEffect(() => {
        if (selectedIds.length !== 2) return

        const [firstId, secondId] = selectedIds
        setIsChecking(true)
        setMoves((prevMoves) => prevMoves + 1)

        const first = cards.find((card) => card.id === firstId)
        const second = cards.find((card) => card.id === secondId)
        const isMatch = first && second && first.animal === second.animal

        if (isMatch) {
            setScore((prevScore) => prevScore + MATCH_POINTS)
            setCards((prevCards) =>
                prevCards.map((card) =>
                    card.id === firstId || card.id === secondId
                        ? {...card, isMatched: true}
                        : card
                )
            )
            setSelectedIds([])
            setIsChecking(false)
            return
        }

        setScore((prevScore) => Math.max(0, prevScore - MISMATCH_PENALTY))
        flipBackTimer.current = setTimeout(() => {
            setCards((prevCards) =>
                prevCards.map((card) =>
                    card.id === firstId || card.id === secondId
                        ? {...card, isFlipped: false}
                        : card
                )
            )
            setSelectedIds([])
            setIsChecking(false)
        }, FLIP_BACK_DELAY)

        return () => clearTimeout(flipBackTimer.current)
    }, [selectedIds, cards])

    const totalPairs = boardSize ? boardSize / 2 : 0
    const matchedPairs = useMemo(
        () => cards.filter((card) => card.isMatched).length / 2,
        [cards]
    )

    useEffect(() => {
        if (
            !boardSize ||
            isWon ||
            isLoading ||
            cards.length === 0 ||
            matchedPairs !== totalPairs
        ) {
            return
        }

        setIsWon(true)
        setBestScore((prevBest) => (score > prevBest ? score : prevBest))
    }, [boardSize, isWon, isLoading, cards.length, matchedPairs, totalPairs, score, setBestScore])

    return {
        cards,
        moves,
        score,
        bestScore,
        isLoading,
        isWon,
        totalPairs,
        matchedPairs,
        startGame,
        changeBoardSize,
        restart,
        flipCard
    }
}